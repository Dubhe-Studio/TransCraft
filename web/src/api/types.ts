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
  createdBy: string
  // 最后一次有译文变更的时间，空串表示尚无贡献
  lastContributionAt: string
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

// 共用进度表接受的行形态，项目进度与部件进度都满足该结构
export type ProgressRow = ProgressStats & { id: number; name: string }

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
  // 部件所属项目的参考语言，面板据此标注模板语言
  referenceLanguage: string
  // 当前用户是否可批准译文：所有者/维护者或含批准权限的项目用户组成员
  canApprove: boolean
}

export interface PartProgress extends Part, ProgressStats {}

export interface ProjectMember {
  username: string
  displayName: string
  avatarUrl: string
  role: ProjectRole
}

// 翻译条目：source 为模板语言原文，primary 为当前用户第一语言的既有译文（对照用，空串表示无），target 为当前语言译文，空串表示未翻译
export interface TranslationEntry {
  key: string
  source: string
  primary: string
  target: string
  approved: boolean
}

// 项目级用户组，permissions 为权限标识列表，'approve' 表示批准译文
export interface ProjectGroup {
  id: number
  projectId: number
  name: string
  permissions: string[]
  members: string[]
}

export interface ProjectGroupInput {
  name: string
  permissions: string[]
  members: string[]
}

// 站点级用户组，只做成员归组展示，不参与权限判定
export interface SiteGroup {
  id: number
  name: string
  members: string[]
}

export interface SiteGroupInput {
  name: string
  members: string[]
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
