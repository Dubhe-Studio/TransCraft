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

// 项目在指定语言下的翻译进度统计，用于仪表盘进度表
export interface ProjectProgress extends ProjectSummary {
  translatedPercent: number
  incompleteStrings: number
  incompleteWords: number
  incompleteChars: number
  untranslatedStrings: number
  failingChecks: number
  suggestions: number
  comments: number
}

export interface LanguageInfo {
  code: string
  name: string
}
