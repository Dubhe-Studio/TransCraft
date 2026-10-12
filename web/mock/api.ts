// 纯前端开发（pnpm dev）时接管 /api 的模拟接口，让页面无需后端即可完整走通交互。
// 后端接口就绪后设 MOCK_API=false 可停用，改走 vite 代理连接真实后端。
// 数据口径与 src/api 下各模块约定的前后端契约保持一致。
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import type { LanguageInfo, LoginResult, ProjectProgress, ProjectSummary, UserProfile } from '../src/api/types.ts'

// 使用 admin 角色以便开发时能看到全部菜单项
const demoUser: UserProfile = {
  id: 1,
  username: 'translator',
  displayName: '示例译者',
  avatarUrl: '',
  role: 'admin',
  primaryLanguage: 'zh_cn',
  secondaryLanguages: ['en_us', 'ja_jp'],
}

// 模拟环境不做真实口令校验，任意非空账号密码均可登录
const demoToken = 'mock-token'

// 记录最近一次登录/注册的账号，使 /users/me 与会话保持一致
let sessionUser: UserProfile = demoUser

const languages: LanguageInfo[] = [
  { code: 'en_us', name: 'English (US)' },
  { code: 'en_gb', name: 'English (UK)' },
  { code: 'zh_cn', name: '简体中文' },
  { code: 'zh_tw', name: '繁體中文（台灣）' },
  { code: 'zh_hk', name: '繁體中文（香港）' },
  { code: 'lzh', name: '文言' },
  { code: 'ja_jp', name: '日本語' },
  { code: 'ko_kr', name: '한국어' },
  { code: 'ru_ru', name: 'Русский' },
  { code: 'de_de', name: 'Deutsch' },
  { code: 'fr_fr', name: 'Français' },
  { code: 'es_es', name: 'Español (España)' },
  { code: 'es_mx', name: 'Español (México)' },
  { code: 'pt_br', name: 'Português (Brasil)' },
  { code: 'pt_pt', name: 'Português (Portugal)' },
  { code: 'it_it', name: 'Italiano' },
  { code: 'nl_nl', name: 'Nederlands' },
  { code: 'pl_pl', name: 'Polski' },
  { code: 'tr_tr', name: 'Türkçe' },
  { code: 'uk_ua', name: 'Українська' },
  { code: 'vi_vn', name: 'Tiếng Việt' },
  { code: 'th_th', name: 'ไทย' },
  { code: 'id_id', name: 'Bahasa Indonesia' },
  { code: 'ms_my', name: 'Bahasa Melayu' },
  { code: 'ar_sa', name: 'العربية' },
  { code: 'he_il', name: 'עברית' },
  { code: 'sv_se', name: 'Svenska' },
  { code: 'fi_fi', name: 'Suomi' },
  { code: 'da_dk', name: 'Dansk' },
  { code: 'nb_no', name: 'Norsk bokmål' },
  { code: 'cs_cz', name: 'Čeština' },
  { code: 'hu_hu', name: 'Magyar' },
  { code: 'el_gr', name: 'Ελληνικά' },
  { code: 'bg_bg', name: 'Български' },
  { code: 'ro_ro', name: 'Română' },
]

const followed: ProjectSummary[] = [
  { id: 1, name: 'Create', namespace: 'create', description: '机械动力：传动与自动化的美学' },
  { id: 2, name: "Farmer's Delight", namespace: 'farmersdelight', description: '农夫乐事：更丰富的农耕与烹饪' },
  { id: 3, name: 'Applied Energistics 2', namespace: 'ae2', description: '应用能源 2：数字化物品存储网络' },
]

// 模拟数据不区分语言：真实后端按语言统计，这里所有语言返回同一份进度
const followedProgress: ProjectProgress[] = [
  {
    ...followed[0],
    translatedPercent: 50,
    incompleteStrings: 32203,
    incompleteWords: 219570,
    incompleteChars: 1383199,
    untranslatedStrings: 28826,
    failingChecks: 14383,
    suggestions: 26112,
    comments: 0,
  },
  {
    ...followed[1],
    translatedPercent: 100,
    incompleteStrings: 0,
    incompleteWords: 0,
    incompleteChars: 0,
    untranslatedStrings: 0,
    failingChecks: 0,
    suggestions: 0,
    comments: 0,
  },
  {
    ...followed[2],
    translatedPercent: 33,
    incompleteStrings: 1004,
    incompleteWords: 4000,
    incompleteChars: 26028,
    untranslatedStrings: 1004,
    failingChecks: 13,
    suggestions: 946,
    comments: 0,
  },
]

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status
  if (status === 204) {
    res.end()
    return
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf-8')
      if (!text) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text) as Record<string, unknown>)
      } catch {
        reject(new Error(`请求体不是合法 JSON: ${text.slice(0, 200)}`))
      }
    })
    req.on('error', reject)
  })
}

// 需要登录的接口与真实后端一致地校验令牌
function hasToken(req: IncomingMessage): boolean {
  return req.headers.authorization === `Bearer ${demoToken}`
}

const handle: Connect.NextHandleFunction = (req, res, next) => {
  void route(req, res, next).catch((error: unknown) => {
    console.error('[mock-api] 处理请求失败:', error)
    sendJson(res, 500, { message: '模拟接口内部错误' })
  })
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
): Promise<void> {
  const path = (req.url ?? '').split('?')[0]
  if (!path.startsWith('/api/')) {
    next()
    return
  }

  // 公开接口无需令牌；需要登录的接口在各自分支内校验
  if (req.method === 'GET' && path === '/api/auth/register-config') {
    sendJson(res, 200, { inviteRequired: false })
    return
  }
  if (req.method === 'GET' && path === '/api/languages') {
    sendJson(res, 200, languages)
    return
  }

  if (req.method === 'POST' && path === '/api/auth/login') {
    const body = await readBody(req)
    if (typeof body.account !== 'string' || !body.account || typeof body.password !== 'string' || !body.password) {
      sendJson(res, 400, { message: '账号与密码不能为空' })
      return
    }
    sessionUser = demoUser
    const result: LoginResult = { token: demoToken, user: demoUser }
    sendJson(res, 200, result)
    return
  }

  if (req.method === 'POST' && path === '/api/auth/register') {
    const body = await readBody(req)
    if (
      typeof body.username !== 'string' || !body.username ||
      typeof body.email !== 'string' || !body.email ||
      typeof body.password !== 'string' || !body.password ||
      typeof body.emailCode !== 'string' || !body.emailCode
    ) {
      sendJson(res, 400, { message: '请完整填写注册信息' })
      return
    }
    sessionUser = { ...demoUser, username: body.username, displayName: body.username, role: 'user' }
    const result: LoginResult = { token: demoToken, user: sessionUser }
    sendJson(res, 200, result)
    return
  }

  if (req.method === 'POST' && path === '/api/auth/email-code') {
    const body = await readBody(req)
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      sendJson(res, 400, { message: '邮箱格式不正确' })
      return
    }
    sendJson(res, 204, undefined)
    return
  }

  if (req.method === 'GET' && path === '/api/users/me') {
    if (!hasToken(req)) {
      req.resume()
      sendJson(res, 401, { message: '未登录或会话已过期' })
      return
    }
    sendJson(res, 200, sessionUser)
    return
  }
  if (req.method === 'GET' && path === '/api/projects/followed') {
    if (!hasToken(req)) {
      req.resume()
      sendJson(res, 401, { message: '未登录或会话已过期' })
      return
    }
    sendJson(res, 200, followed)
    return
  }
  if (req.method === 'GET' && path === '/api/projects/followed/progress') {
    if (!hasToken(req)) {
      req.resume()
      sendJson(res, 401, { message: '未登录或会话已过期' })
      return
    }
    sendJson(res, 200, followedProgress)
    return
  }

  req.resume()
  sendJson(res, 404, { message: `模拟接口未实现 ${req.method} ${path}` })
}

export function mockApi(): Plugin {
  return {
    name: 'transcraft-mock-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
  }
}
