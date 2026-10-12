import type { LocationQuery } from 'vue-router'

// 登录成功后的回跳地址仅允许站内路径，排除 // 开头的协议相对地址
export function redirectTarget(query: LocationQuery): string {
  const target = query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/dashboard'
}
