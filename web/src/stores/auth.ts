import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { setTokenProvider } from '../api/client'
import * as authApi from '../api/auth'
import type { LoginResult, UserProfile } from '../api/types'

const STORAGE_KEY = 'transcraft_auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref('')
    const user = ref<UserProfile | null>(null)

    // 请求层在每次发请求时读取最新令牌，登录、登出与刷新后的恢复都不需要再同步副本
    setTokenProvider(() => token.value)

    const isLoggedIn = computed(() => token.value !== '')
    // 管理入口仅管理员与站点所有者可见
    const canManage = computed(() => user.value?.role === 'admin' || user.value?.role === 'owner')

    function applyLogin(result: LoginResult): void {
      token.value = result.token
      user.value = result.user
    }

    async function login(account: string, password: string): Promise<void> {
      applyLogin(await authApi.login(account, password))
    }

    // 页面刷新后令牌由持久化插件恢复但用户信息丢失，需要重新拉取；401 由全局处理器统一清理会话
    async function fetchMe(): Promise<void> {
      if (!token.value || user.value) {
        return
      }
      user.value = await authApi.me()
    }

    function logout(): void {
      token.value = ''
      user.value = null
    }

    return { token, user, isLoggedIn, canManage, applyLogin, login, fetchMe, logout }
  },
  {
    persist: {
      key: STORAGE_KEY,
      // 用户信息不落本地：每次启动都重新拉取，避免沿用已过期或已变更的角色
      pick: ['token'],
      // 本地记录属不可信输入，非字符串令牌一律视为未登录
      afterHydrate: ({ store }) => {
        store.token = typeof store.token === 'string' ? store.token : ''
      },
    },
  },
)
