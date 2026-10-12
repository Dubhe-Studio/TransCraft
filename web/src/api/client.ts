// 后端 API 的统一访问入口：JSON 编解码、Bearer 鉴权头与错误规范化。
// 后端鉴权接口落地前，这里约定的路径即前后端契约，见 auth.ts / project.ts / language.ts。

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'transcraft_token'

// 401 时统一清理会话并跳回登录页；由路由模块注入，避免 client 反向依赖 router
let onUnauthorized: (() => void) | undefined

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export function readToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function writeToken(token: string): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = readToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  let payload: string | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const resp = await fetch(`/api${path}`, { method, headers, body: payload })
  if (!resp.ok) {
    if (resp.status === 401) {
      onUnauthorized?.()
    }
    let message = `请求失败（HTTP ${resp.status}）`
    try {
      const data = (await resp.json()) as { message?: string }
      if (data.message) {
        message = data.message
      }
    } catch (parseError) {
      console.warn(`解析错误响应体失败（${method} ${path}）:`, parseError)
    }
    throw new ApiError(resp.status, message)
  }
  if (resp.status === 204) {
    return undefined as T
  }
  return (await resp.json()) as T
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}
