import { get, post } from './client'
import type { LoginResult, RegisterConfig, UserProfile } from './types'

export function login(account: string, password: string): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', { account, password })
}

export interface RegisterParams {
  username: string
  email: string
  password: string
  emailCode: string
  inviteCode?: string
}

export function register(params: RegisterParams): Promise<LoginResult> {
  return post<LoginResult>('/auth/register', params)
}

export function sendEmailCode(email: string): Promise<void> {
  return post<void>('/auth/email-code', { email })
}

export function registerConfig(): Promise<RegisterConfig> {
  return get<RegisterConfig>('/auth/register-config')
}

export function me(): Promise<UserProfile> {
  return get<UserProfile>('/users/me')
}
