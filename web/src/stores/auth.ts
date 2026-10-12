import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readToken, writeToken } from '../api/client'
import * as authApi from '../api/auth'
import type { LoginResult, UserProfile } from '../api/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(readToken())
  const user = ref<UserProfile | null>(null)

  const isLoggedIn = computed(() => token.value !== '')
  // 管理入口仅管理员与站点所有者可见
  const canManage = computed(() => user.value?.role === 'admin' || user.value?.role === 'owner')

  function applyLogin(result: LoginResult): void {
    token.value = result.token
    user.value = result.user
    writeToken(result.token)
  }

  async function login(account: string, password: string): Promise<void> {
    applyLogin(await authApi.login(account, password))
  }

  // 页面刷新后 token 仍在本地但用户信息丢失，需要重新拉取；401 由全局处理器统一清理会话
  async function fetchMe(): Promise<void> {
    if (!token.value || user.value) {
      return
    }
    user.value = await authApi.me()
  }

  function logout(): void {
    token.value = ''
    user.value = null
    writeToken('')
  }

  return { token, user, isLoggedIn, canManage, applyLogin, login, fetchMe, logout }
})
