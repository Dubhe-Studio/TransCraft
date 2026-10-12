export type UserRole = 'admin' | 'owner' | 'user'

export interface UserProfile {
  id: number
  username: string
  displayName: string
  avatarUrl: string
  role: UserRole
  primaryLanguage: string
  secondaryLanguages: string[]
}

export interface LoginResult {
  token: string
  user: UserProfile
}

export interface RegisterConfig {
  inviteRequired: boolean
}

export interface ProjectSummary {
  id: number
  name: string
  namespace: string
  description: string
}

export interface LanguageInfo {
  code: string
  name: string
}
