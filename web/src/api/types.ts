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

// 项目与部件共用的翻译进度统计口径
export interface ProgressStats {
  translatedPercent: number
  incompleteStrings: number
  incompleteWords: number
  incompleteChars: number
  untranslatedStrings: number
  failingChecks: number
  suggestions: number
  comments: number
}

// 项目在指定语言下的翻译进度统计，用于仪表盘进度表
export interface ProjectProgress extends ProjectSummary, ProgressStats {}

// 项目成员在项目内的角色，控制管理入口显隐
export type ProjectRole = 'owner' | 'maintainer' | 'translator'

export interface ProjectDetail extends ProjectSummary {
  repoUrl: string
  branch: string
  // fork 为空串表示直接向原仓库推送
  forkOwner: string
  forkBranch: string
  fileMask: string
  templatePath: string
  referenceLanguage: string
  role: ProjectRole
}

export interface ProjectInput {
  name: string
  namespace: string
  description: string
  repoUrl: string
  branch: string
  forkOwner: string
  forkBranch: string
  fileMask: string
  templatePath: string
  referenceLanguage: string
}

// 部件对应仓库中 assets/<namespace> 的一个命名空间
export interface Part {
  id: number
  projectId: number
  name: string
  namespace: string
  fileMask: string
  templatePath: string
}

export interface PartInput {
  projectId: number
  name: string
  namespace: string
  fileMask: string
  templatePath: string
}

export interface PartDetail extends Part {
  projectName: string
}

export interface PartProgress extends Part, ProgressStats {}

export interface ProjectMember {
  username: string
  displayName: string
  avatarUrl: string
  role: ProjectRole
}

// 翻译条目：source 为参考语言原文，target 为当前语言译文，空串表示未翻译
export interface TranslationEntry {
  key: string
  source: string
  target: string
}

export interface UserPublicProfile {
  username: string
  displayName: string
  avatarUrl: string
  primaryLanguage: string
  secondaryLanguages: string[]
  followed: ProjectSummary[]
}

export interface ProfileInput {
  displayName: string
  avatarUrl: string
  primaryLanguage: string
  secondaryLanguages: string[]
}

export interface AdminUser extends UserProfile {
  email: string
  createdAt: string
}

export interface InviteCode {
  code: string
  createdAt: string
  // 已使用的邀请码记录使用人，空串表示未使用
  usedBy: string
}

// 顶栏"更多"菜单的外链配置，空串表示该项不展示
export interface SiteLinks {
  contact: string
  docs: string
  contribute: string
  support: string
}

export interface LanguageInfo {
  code: string
  name: string
}
