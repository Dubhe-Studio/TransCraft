// 纯前端开发（pnpm dev）时接管 /api 的模拟接口，让页面无需后端即可完整走通交互。
// 后端接口就绪后设 MOCK_API=false 可停用，改走 vite 代理连接真实后端。
// 数据口径与 src/api 下各模块约定的前后端契约保持一致。
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import type {
  AdminUser,
  InviteCode,
  LanguageInfo,
  LoginResult,
  Part,
  PartDetail,
  PartInput,
  PartProgress,
  ProjectDetail,
  ProjectGroup,
  ProjectMember,
  ProjectProgress,
  ProjectSummary,
  SiteGroup,
  SiteLinks,
  TranslationEntry,
  UserProfile,
  UserPublicProfile,
} from '../src/api/types.ts'

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

const projects: ProjectDetail[] = [
  {
    id: 1,
    name: 'Create',
    namespace: 'create',
    description: '机械动力：传动与自动化的美学',
    createdBy: 'translator',
    lastContributionAt: '2026-10-10T15:20:00+08:00',
    repoUrl: 'https://github.com/Creators-of-Create/Create',
    branch: 'main',
    forkOwner: '',
    forkBranch: '',
    fileMask: 'src/main/resources/assets/create/lang/*.json',
    templatePath: 'src/generated/resources/assets/create/lang/en_us.json',
    referenceLanguage: 'en_us',
    role: 'owner',
  },
  {
    id: 2,
    name: "Farmer's Delight",
    namespace: 'farmersdelight',
    description: '农夫乐事：更丰富的农耕与烹饪',
    createdBy: 'translator',
    lastContributionAt: '2026-09-28T09:00:00+08:00',
    repoUrl: 'https://github.com/vectorwing/FarmersDelight',
    branch: '1.20',
    forkOwner: '',
    forkBranch: '',
    fileMask: 'src/main/resources/assets/farmersdelight/lang/*.json',
    templatePath: 'src/main/resources/assets/farmersdelight/lang/en_us.json',
    referenceLanguage: 'en_us',
    role: 'owner',
  },
  {
    id: 3,
    name: 'Applied Energistics 2',
    namespace: 'ae2',
    description: '应用能源 2：数字化物品存储网络',
    createdBy: 'carol',
    lastContributionAt: '2026-10-11T21:40:00+08:00',
    repoUrl: 'https://github.com/AppliedEnergistics/Applied-Energistics-2',
    branch: 'main',
    forkOwner: 'translator',
    forkBranch: 'zh_cn-translation',
    fileMask: 'src/main/resources/assets/ae2/lang/*.json',
    templatePath: 'src/main/resources/assets/ae2/lang/en_us.json',
    referenceLanguage: 'en_us',
    role: 'translator',
  },
]

const followed: ProjectSummary[] = projects.map((p) => ({
  id: p.id,
  name: p.name,
  namespace: p.namespace,
  description: p.description,
  createdBy: p.createdBy,
  lastContributionAt: p.lastContributionAt,
}))

const parts: Part[] = [
  {
    id: 10,
    projectId: 1,
    name: 'Create 本体',
    namespace: 'create',
    fileMask: 'src/main/resources/assets/create/lang/*.json',
    templatePath: 'src/generated/resources/assets/create/lang/en_us.json',
  },
  {
    id: 20,
    projectId: 2,
    name: "Farmer's Delight 本体",
    namespace: 'farmersdelight',
    fileMask: 'src/main/resources/assets/farmersdelight/lang/*.json',
    templatePath: 'src/main/resources/assets/farmersdelight/lang/en_us.json',
  },
  {
    id: 30,
    projectId: 3,
    name: 'AE2 本体',
    namespace: 'ae2',
    fileMask: 'src/main/resources/assets/ae2/lang/*.json',
    templatePath: 'src/main/resources/assets/ae2/lang/en_us.json',
  },
]

// 统计数字是示意数据，与条目数量不追求严格对应
const partStats: Record<number, PartProgress> = {
  10: {
    ...parts[0],
    translatedPercent: 50,
    incompleteStrings: 32203,
    incompleteWords: 219570,
    incompleteChars: 1383199,
    untranslatedStrings: 28826,
    failingChecks: 14383,
    suggestions: 26112,
    comments: 0,
  },
  20: {
    ...parts[1],
    translatedPercent: 100,
    incompleteStrings: 0,
    incompleteWords: 0,
    incompleteChars: 0,
    untranslatedStrings: 0,
    failingChecks: 0,
    suggestions: 0,
    comments: 0,
  },
  30: {
    ...parts[2],
    translatedPercent: 33,
    incompleteStrings: 1004,
    incompleteWords: 4000,
    incompleteChars: 26028,
    untranslatedStrings: 1004,
    failingChecks: 13,
    suggestions: 946,
    comments: 0,
  },
}

// 仪表盘项目进度为项目下全部部件的汇总示意，mock 直接沿用了部件口径
const followedProgress: ProjectProgress[] = projects.map((p) => {
  const stats = Object.values(partStats).find((s) => s.projectId === p.id) ?? partStats[10]
  const { id: _partId, projectId: _projectId, ...rest } = stats
  return { ...p, ...rest }
})

const members: Record<number, ProjectMember[]> = {
  1: [
    { username: 'translator', displayName: '示例译者', avatarUrl: '', role: 'owner' },
    { username: 'dev-li', displayName: '李开发', avatarUrl: '', role: 'maintainer' },
    { username: 'alice', displayName: 'Alice', avatarUrl: '', role: 'translator' },
  ],
  2: [
    { username: 'translator', displayName: '示例译者', avatarUrl: '', role: 'owner' },
    { username: 'bob', displayName: 'Bob', avatarUrl: '', role: 'translator' },
  ],
  3: [
    { username: 'carol', displayName: 'Carol', avatarUrl: '', role: 'owner' },
    { username: 'translator', displayName: '示例译者', avatarUrl: '', role: 'translator' },
  ],
}

// 条目以英文为参考语言原文，zhCn 为简体中文译文，空串表示该条未翻译
interface MockEntry {
  key: string
  source: string
  zhCn: string
}

const entries: Record<number, MockEntry[]> = {
  10: [
    { key: 'item.create.andesite_alloy', source: 'Andesite Alloy', zhCn: '安山合金' },
    { key: 'item.create.brass_ingot', source: 'Brass Ingot', zhCn: '黄铜锭' },
    { key: 'item.create.copper_sheet', source: 'Copper Sheet', zhCn: '铜板' },
    { key: 'item.create.zinc_ingot', source: 'Zinc Ingot', zhCn: '锌锭' },
    { key: 'block.create.cogwheel', source: 'Cogwheel', zhCn: '齿轮' },
    { key: 'block.create.large_cogwheel', source: 'Large Cogwheel', zhCn: '大齿轮' },
    { key: 'block.create.shaft', source: 'Shaft', zhCn: '传动杆' },
    { key: 'block.create.belt', source: 'Belt', zhCn: '' },
    { key: 'block.create.gearbox', source: 'Gearbox', zhCn: '' },
    { key: 'block.create.mechanical_press', source: 'Mechanical Press', zhCn: '机械压力机' },
    { key: 'block.create.mechanical_mixer', source: 'Mechanical Mixer', zhCn: '' },
    { key: 'block.create.crushing_wheel', source: 'Crushing Wheel', zhCn: '' },
    { key: 'block.create.water_wheel', source: 'Water Wheel', zhCn: '水车' },
    { key: 'item.create.wrench', source: 'Wrench', zhCn: '扳手' },
    { key: 'item.create.goggles', source: "Engineer's Goggles", zhCn: '' },
    { key: 'block.create.depot', source: 'Depot', zhCn: '' },
  ],
  20: [
    { key: 'block.farmersdelight.stove', source: 'Stove', zhCn: '炉灶' },
    { key: 'block.farmersdelight.cooking_pot', source: 'Cooking Pot', zhCn: '烹饪锅' },
    { key: 'block.farmersdelight.skillet', source: 'Skillet', zhCn: '煎锅' },
    { key: 'block.farmersdelight.cutting_board', source: 'Cutting Board', zhCn: '砧板' },
    { key: 'item.farmersdelight.fried_egg', source: 'Fried Egg', zhCn: '煎蛋' },
    { key: 'item.farmersdelight.hamburger', source: 'Hamburger', zhCn: '汉堡' },
    { key: 'item.farmersdelight.dumplings', source: 'Dumplings', zhCn: '饺子' },
    { key: 'item.farmersdelight.cabbage', source: 'Cabbage', zhCn: '卷心菜' },
    { key: 'item.farmersdelight.tomato', source: 'Tomato', zhCn: '番茄' },
    { key: 'item.farmersdelight.onion', source: 'Onion', zhCn: '洋葱' },
    { key: 'item.farmersdelight.rice', source: 'Rice', zhCn: '稻米' },
    { key: 'item.farmersdelight.knife', source: 'Knife', zhCn: '小刀' },
  ],
  30: [
    { key: 'item.ae2.certus_quartz_crystal', source: 'Certus Quartz Crystal', zhCn: '赛特斯石英水晶' },
    { key: 'item.ae2.silicon', source: 'Silicon', zhCn: '硅' },
    { key: 'block.ae2.controller', source: 'ME Controller', zhCn: 'ME 控制器' },
    { key: 'block.ae2.interface', source: 'ME Interface', zhCn: 'ME 接口' },
    { key: 'block.ae2.me_chest', source: 'ME Chest', zhCn: '' },
    { key: 'block.ae2.drive', source: 'ME Drive', zhCn: '' },
    { key: 'block.ae2.cable', source: 'ME Glass Cable', zhCn: '' },
    { key: 'item.ae2.cell_1k', source: '1k ME Storage Cell', zhCn: '' },
    { key: 'item.ae2.cell_4k', source: '4k ME Storage Cell', zhCn: '' },
    { key: 'item.ae2.wireless_terminal', source: 'Wireless Terminal', zhCn: '' },
    { key: 'block.ae2.charger', source: 'Charger', zhCn: '' },
    { key: 'item.ae2.flux_dust', source: 'Flux Dust', zhCn: '' },
  ],
}

// 编辑器保存的译文按 部件|语言|键 存放，覆盖条目初始译文
const savedTargets: Record<string, string> = {}

// 批准状态与建议计数同样按 部件|语言|键 存放
const savedApproved: Record<string, boolean> = {}
const suggestionCounts: Record<string, number> = {}

// 项目 3 预置审校组并含当前演示用户，用于演示译者经用户组获得批准权限
const projectGroupData: Record<number, ProjectGroup[]> = {
  3: [{ id: 1, projectId: 3, name: '审校', permissions: ['approve'], members: ['translator'] }],
}

const siteGroupData: SiteGroup[] = [
  { id: 1, name: '站点审校', members: ['translator', 'alice'] },
]

const mockUsers: AdminUser[] = [
  { ...demoUser, email: 'translator@example.com', createdAt: '2026-08-01T09:00:00+08:00' },
  { id: 2, username: 'dev-li', displayName: '李开发', avatarUrl: '', role: 'user', primaryLanguage: 'zh_cn', secondaryLanguages: [], email: 'dev-li@example.com', createdAt: '2026-08-12T14:30:00+08:00' },
  { id: 3, username: 'alice', displayName: 'Alice', avatarUrl: '', role: 'user', primaryLanguage: 'en_us', secondaryLanguages: ['zh_cn'], email: 'alice@example.com', createdAt: '2026-09-02T20:15:00+08:00' },
  { id: 4, username: 'bob', displayName: 'Bob', avatarUrl: '', role: 'user', primaryLanguage: 'en_us', secondaryLanguages: [], email: 'bob@example.com', createdAt: '2026-09-20T08:45:00+08:00' },
  { id: 5, username: 'carol', displayName: 'Carol', avatarUrl: '', role: 'user', primaryLanguage: 'ja_jp', secondaryLanguages: ['en_us'], email: 'carol@example.com', createdAt: '2026-10-01T11:00:00+08:00' },
]

const inviteList: InviteCode[] = [
  { code: 'WELCOME-2026', createdAt: '2026-09-01T10:00:00+08:00', usedBy: '' },
  { code: 'BETA-TESTER', createdAt: '2026-09-15T16:00:00+08:00', usedBy: 'alice' },
]

// support 为空串，演示"更多"菜单对未配置项的隐藏
let siteLinkConfig: SiteLinks = {
  contact: 'mailto:admin@transcraft.example.com',
  docs: 'https://github.com/Dubhe-Studio/TransCraft#readme',
  contribute: 'https://github.com/Dubhe-Studio/TransCraft',
  support: '',
}

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

// 返回 false 表示已响应 401，调用方直接结束
function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (hasToken(req)) {
    return true
  }
  req.resume()
  sendJson(res, 401, { message: '未登录或会话已过期' })
  return false
}

// 返回 false 表示已响应 401/403，调用方直接结束
function requireAdmin(req: IncomingMessage, res: ServerResponse): boolean {
  if (!requireAuth(req, res)) {
    return false
  }
  if (sessionUser.role !== 'admin') {
    req.resume()
    sendJson(res, 403, { message: '需要管理员权限' })
    return false
  }
  return true
}

function queryParam(req: IncomingMessage, name: string): string {
  const query = (req.url ?? '').split('?')[1] ?? ''
  return new URLSearchParams(query).get(name) ?? ''
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
  if (req.method === 'GET' && path === '/api/site/links') {
    sendJson(res, 200, siteLinkConfig)
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
    if (!requireAuth(req, res)) return
    sendJson(res, 200, sessionUser)
    return
  }
  if (req.method === 'PUT' && path === '/api/users/me') {
    if (!requireAuth(req, res)) return
    const body = await readBody(req)
    if (typeof body.displayName !== 'string' || typeof body.avatarUrl !== 'string' ||
        typeof body.primaryLanguage !== 'string' || !Array.isArray(body.secondaryLanguages)) {
      sendJson(res, 400, { message: '资料字段不完整' })
      return
    }
    sessionUser = {
      ...sessionUser,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
      primaryLanguage: body.primaryLanguage,
      secondaryLanguages: body.secondaryLanguages as string[],
    }
    sendJson(res, 200, sessionUser)
    return
  }
  if (req.method === 'POST' && path === '/api/users/me/password') {
    if (!requireAuth(req, res)) return
    const body = await readBody(req)
    if (typeof body.oldPassword !== 'string' || !body.oldPassword ||
        typeof body.newPassword !== 'string' || !body.newPassword) {
      sendJson(res, 400, { message: '请填写原密码与新密码' })
      return
    }
    sendJson(res, 204, undefined)
    return
  }

  const userHomeMatch = /^\/api\/users\/([^/]+)$/.exec(path)
  if (req.method === 'GET' && userHomeMatch) {
    if (!requireAuth(req, res)) return
    const name = decodeURIComponent(userHomeMatch[1])
    const base = name === sessionUser.username
      ? sessionUser
      : mockUsers.find((u) => u.username === name)
    if (!base) {
      sendJson(res, 404, { message: '用户不存在' })
      return
    }
    const profile: UserPublicProfile = {
      username: base.username,
      displayName: base.displayName,
      avatarUrl: base.avatarUrl,
      primaryLanguage: base.primaryLanguage,
      secondaryLanguages: base.secondaryLanguages,
      followed: base.username === 'translator' ? followed : followed.slice(0, 1),
    }
    sendJson(res, 200, profile)
    return
  }

  if (req.method === 'GET' && path === '/api/projects/followed') {
    if (!requireAuth(req, res)) return
    sendJson(res, 200, followed)
    return
  }
  if (req.method === 'GET' && path === '/api/projects/followed/progress') {
    if (!requireAuth(req, res)) return
    sendJson(res, 200, followedProgress)
    return
  }
  if (req.method === 'GET' && path === '/api/projects') {
    if (!requireAuth(req, res)) return
    const sort = queryParam(req, 'sort')
    const list = projects.map((p) => ({
      id: p.id,
      name: p.name,
      namespace: p.namespace,
      description: p.description,
      createdBy: p.createdBy,
      lastContributionAt: p.lastContributionAt,
    }))
    if (sort === 'creator') {
      list.sort((a, b) => a.createdBy.localeCompare(b.createdBy) || a.name.localeCompare(b.name))
    } else if (sort === 'activity') {
      // 无贡献记录的项目排在最后
      list.sort((a, b) => (b.lastContributionAt || '').localeCompare(a.lastContributionAt || ''))
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    sendJson(res, 200, list)
    return
  }
  if (req.method === 'POST' && path === '/api/projects') {
    if (!requireAuth(req, res)) return
    const body = await readBody(req)
    if (typeof body.name !== 'string' || !body.name ||
        typeof body.namespace !== 'string' || !body.namespace ||
        typeof body.repoUrl !== 'string' || !body.repoUrl) {
      sendJson(res, 400, { message: '项目名称、命名空间与仓库地址不能为空' })
      return
    }
    const created: ProjectDetail = {
      id: Math.max(...projects.map((p) => p.id)) + 1,
      name: body.name,
      namespace: body.namespace,
      description: typeof body.description === 'string' ? body.description : '',
      createdBy: sessionUser.username,
      lastContributionAt: '',
      repoUrl: body.repoUrl,
      branch: typeof body.branch === 'string' && body.branch ? body.branch : 'main',
      forkOwner: typeof body.forkOwner === 'string' ? body.forkOwner : '',
      forkBranch: typeof body.forkBranch === 'string' ? body.forkBranch : '',
      fileMask: typeof body.fileMask === 'string' ? body.fileMask : '',
      templatePath: typeof body.templatePath === 'string' ? body.templatePath : '',
      referenceLanguage: typeof body.referenceLanguage === 'string' && body.referenceLanguage ? body.referenceLanguage : 'en_us',
      // 创建者即为项目所有者
      role: 'owner',
    }
    projects.push(created)
    followed.push({
      id: created.id,
      name: created.name,
      namespace: created.namespace,
      description: created.description,
      createdBy: created.createdBy,
      lastContributionAt: created.lastContributionAt,
    })
    sendJson(res, 200, created)
    return
  }

  const projectMatch = /^\/api\/projects\/(\d+)$/.exec(path)
  if (projectMatch && req.method === 'GET') {
    if (!requireAuth(req, res)) return
    const found = projects.find((p) => p.id === Number(projectMatch[1]))
    if (!found) {
      sendJson(res, 404, { message: '项目不存在' })
      return
    }
    sendJson(res, 200, found)
    return
  }
  if (projectMatch && req.method === 'PUT') {
    if (!requireAuth(req, res)) return
    const found = projects.find((p) => p.id === Number(projectMatch[1]))
    if (!found) {
      sendJson(res, 404, { message: '项目不存在' })
      return
    }
    const body = await readBody(req)
    if (typeof body.name !== 'string' || !body.name ||
        typeof body.namespace !== 'string' || !body.namespace ||
        typeof body.repoUrl !== 'string' || !body.repoUrl) {
      sendJson(res, 400, { message: '项目名称、命名空间与仓库地址不能为空' })
      return
    }
    found.name = body.name
    found.namespace = body.namespace
    found.description = typeof body.description === 'string' ? body.description : ''
    found.repoUrl = body.repoUrl
    found.branch = typeof body.branch === 'string' && body.branch ? body.branch : found.branch
    found.forkOwner = typeof body.forkOwner === 'string' ? body.forkOwner : ''
    found.forkBranch = typeof body.forkBranch === 'string' ? body.forkBranch : ''
    found.fileMask = typeof body.fileMask === 'string' ? body.fileMask : ''
    found.templatePath = typeof body.templatePath === 'string' ? body.templatePath : ''
    found.referenceLanguage = typeof body.referenceLanguage === 'string' && body.referenceLanguage ? body.referenceLanguage : found.referenceLanguage
    const summary = followed.find((p) => p.id === found.id)
    if (summary) {
      summary.name = found.name
      summary.namespace = found.namespace
      summary.description = found.description
    }
    sendJson(res, 200, found)
    return
  }

  const projectProgressMatch = /^\/api\/projects\/(\d+)\/progress$/.exec(path)
  if (req.method === 'GET' && projectProgressMatch) {
    if (!requireAuth(req, res)) return
    const projectId = Number(projectProgressMatch[1])
    const list = Object.values(partStats).filter((s) => s.projectId === projectId)
    sendJson(res, 200, list)
    return
  }

  const membersMatch = /^\/api\/projects\/(\d+)\/members$/.exec(path)
  if (req.method === 'GET' && membersMatch) {
    if (!requireAuth(req, res)) return
    sendJson(res, 200, members[Number(membersMatch[1])] ?? [])
    return
  }
  if (req.method === 'POST' && membersMatch) {
    if (!requireAuth(req, res)) return
    const projectId = Number(membersMatch[1])
    const body = await readBody(req)
    if (typeof body.username !== 'string' || !body.username) {
      sendJson(res, 400, { message: '用户名不能为空' })
      return
    }
    const user = mockUsers.find((u) => u.username === body.username)
    if (!user) {
      sendJson(res, 404, { message: '用户不存在' })
      return
    }
    const role = body.role === 'owner' || body.role === 'maintainer' ? body.role : 'translator'
    const list = members[projectId] ?? []
    list.push({ username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role })
    members[projectId] = list
    sendJson(res, 200, list)
    return
  }

  const removeMemberMatch = /^\/api\/projects\/(\d+)\/members\/([^/]+)$/.exec(path)
  if (req.method === 'DELETE' && removeMemberMatch) {
    if (!requireAuth(req, res)) return
    const projectId = Number(removeMemberMatch[1])
    const name = decodeURIComponent(removeMemberMatch[2])
    members[projectId] = (members[projectId] ?? []).filter((m) => m.username !== name)
    sendJson(res, 204, undefined)
    return
  }

  if (req.method === 'POST' && path === '/api/parts') {
    if (!requireAuth(req, res)) return
    const body = await readBody(req)
    if (typeof body.projectId !== 'number' ||
        typeof body.name !== 'string' || !body.name ||
        typeof body.namespace !== 'string' || !body.namespace) {
      sendJson(res, 400, { message: '所属项目、部件名称与命名空间不能为空' })
      return
    }
    const input = body as unknown as PartInput
    const created: Part = {
      id: Math.max(...parts.map((p) => p.id)) + 1,
      projectId: input.projectId,
      name: input.name,
      namespace: input.namespace,
      fileMask: input.fileMask,
      templatePath: input.templatePath,
    }
    parts.push(created)
    sendJson(res, 200, created)
    return
  }

  const partMatch = /^\/api\/parts\/(\d+)$/.exec(path)
  if (req.method === 'GET' && partMatch) {
    if (!requireAuth(req, res)) return
    const found = parts.find((p) => p.id === Number(partMatch[1]))
    if (!found) {
      sendJson(res, 404, { message: '部件不存在' })
      return
    }
    const myRole = (members[found.projectId] ?? []).find((m) => m.username === sessionUser.username)?.role
    const inApproveGroup = (projectGroupData[found.projectId] ?? []).some(
      (g) => g.permissions.includes('approve') && g.members.includes(sessionUser.username),
    )
    const detail: PartDetail = {
      ...found,
      projectName: projects.find((p) => p.id === found.projectId)?.name ?? '',
      referenceLanguage: projects.find((p) => p.id === found.projectId)?.referenceLanguage ?? '',
      canApprove: myRole === 'owner' || myRole === 'maintainer' || inApproveGroup,
    }
    sendJson(res, 200, detail)
    return
  }

  const entriesMatch = /^\/api\/parts\/(\d+)\/entries$/.exec(path)
  if (req.method === 'GET' && entriesMatch) {
    if (!requireAuth(req, res)) return
    const partId = Number(entriesMatch[1])
    const lang = queryParam(req, 'lang')
    const list = entries[partId] ?? []
    // 第一语言对照文本取用户主语言（演示用户为 zh_cn）的既有译文
    const result: TranslationEntry[] = list.map((entry) => ({
      key: entry.key,
      source: entry.source,
      primary: savedTargets[`${partId}|zh_cn|${entry.key}`] ?? entry.zhCn,
      target: savedTargets[`${partId}|${lang}|${entry.key}`] ?? (lang === 'zh_cn' ? entry.zhCn : ''),
      approved: savedApproved[`${partId}|${lang}|${entry.key}`] ?? false,
    }))
    sendJson(res, 200, result)
    return
  }

  const saveEntryMatch = /^\/api\/parts\/(\d+)\/entries\/([^/]+)$/.exec(path)
  if (req.method === 'PUT' && saveEntryMatch) {
    if (!requireAuth(req, res)) return
    const partId = Number(saveEntryMatch[1])
    const key = decodeURIComponent(saveEntryMatch[2])
    const lang = queryParam(req, 'lang')
    const body = await readBody(req)
    if (typeof body.text !== 'string') {
      sendJson(res, 400, { message: '缺少译文内容' })
      return
    }
    if (!(entries[partId] ?? []).some((entry) => entry.key === key)) {
      sendJson(res, 404, { message: '条目不存在' })
      return
    }
    savedTargets[`${partId}|${lang}|${key}`] = body.text
    // 保存译文视为一次贡献，刷新项目的最后贡献时间供活动排序演示
    const ownerPart = parts.find((p) => p.id === partId)
    const ownerProject = projects.find((p) => p.id === ownerPart?.projectId)
    if (ownerProject) {
      ownerProject.lastContributionAt = new Date().toISOString()
      const followedItem = followed.find((p) => p.id === ownerProject.id)
      if (followedItem) {
        followedItem.lastContributionAt = ownerProject.lastContributionAt
      }
    }
    sendJson(res, 204, undefined)
    return
  }

  const approveMatch = /^\/api\/parts\/(\d+)\/entries\/([^/]+)\/approve$/.exec(path)
  if (req.method === 'POST' && approveMatch) {
    if (!requireAuth(req, res)) return
    const partId = Number(approveMatch[1])
    const key = decodeURIComponent(approveMatch[2])
    const lang = queryParam(req, 'lang')
    if (!(entries[partId] ?? []).some((entry) => entry.key === key)) {
      sendJson(res, 404, { message: '条目不存在' })
      return
    }
    savedApproved[`${partId}|${lang}|${key}`] = true
    sendJson(res, 204, undefined)
    return
  }

  const suggestionMatch = /^\/api\/parts\/(\d+)\/entries\/([^/]+)\/suggestions$/.exec(path)
  if (req.method === 'POST' && suggestionMatch) {
    if (!requireAuth(req, res)) return
    const partId = Number(suggestionMatch[1])
    const key = decodeURIComponent(suggestionMatch[2])
    const lang = queryParam(req, 'lang')
    const body = await readBody(req)
    if (typeof body.text !== 'string' || !body.text) {
      sendJson(res, 400, { message: '缺少建议内容' })
      return
    }
    if (!(entries[partId] ?? []).some((entry) => entry.key === key)) {
      sendJson(res, 404, { message: '条目不存在' })
      return
    }
    const countKey = `${partId}|${lang}|${key}`
    suggestionCounts[countKey] = (suggestionCounts[countKey] ?? 0) + 1
    sendJson(res, 204, undefined)
    return
  }

  const projectGroupsMatch = /^\/api\/projects\/(\d+)\/groups$/.exec(path)
  if (req.method === 'GET' && projectGroupsMatch) {
    if (!requireAuth(req, res)) return
    sendJson(res, 200, projectGroupData[Number(projectGroupsMatch[1])] ?? [])
    return
  }
  if (req.method === 'POST' && projectGroupsMatch) {
    if (!requireAuth(req, res)) return
    const projectId = Number(projectGroupsMatch[1])
    const body = await readBody(req)
    if (typeof body.name !== 'string' || !body.name || !Array.isArray(body.permissions) || !Array.isArray(body.members)) {
      sendJson(res, 400, { message: '用户组字段不完整' })
      return
    }
    const list = projectGroupData[projectId] ?? []
    const maxId = Math.max(0, ...Object.values(projectGroupData).flat().map((g) => g.id))
    list.push({ id: maxId + 1, projectId, name: body.name, permissions: body.permissions as string[], members: body.members as string[] })
    projectGroupData[projectId] = list
    sendJson(res, 200, list)
    return
  }

  const projectGroupMatch = /^\/api\/projects\/(\d+)\/groups\/(\d+)$/.exec(path)
  if (req.method === 'PUT' && projectGroupMatch) {
    if (!requireAuth(req, res)) return
    const projectId = Number(projectGroupMatch[1])
    const groupId = Number(projectGroupMatch[2])
    const list = projectGroupData[projectId] ?? []
    const found = list.find((g) => g.id === groupId)
    if (!found) {
      sendJson(res, 404, { message: '用户组不存在' })
      return
    }
    const body = await readBody(req)
    if (typeof body.name !== 'string' || !body.name || !Array.isArray(body.permissions) || !Array.isArray(body.members)) {
      sendJson(res, 400, { message: '用户组字段不完整' })
      return
    }
    found.name = body.name
    found.permissions = body.permissions as string[]
    found.members = body.members as string[]
    sendJson(res, 200, list)
    return
  }
  if (req.method === 'DELETE' && projectGroupMatch) {
    if (!requireAuth(req, res)) return
    const projectId = Number(projectGroupMatch[1])
    const groupId = Number(projectGroupMatch[2])
    projectGroupData[projectId] = (projectGroupData[projectId] ?? []).filter((g) => g.id !== groupId)
    sendJson(res, 204, undefined)
    return
  }

  if (req.method === 'GET' && path === '/api/admin/users') {
    if (!requireAdmin(req, res)) return
    const list = mockUsers.map((u) => (u.username === sessionUser.username ? { ...u, ...sessionUser } : u))
    sendJson(res, 200, list)
    return
  }

  const roleMatch = /^\/api\/admin\/users\/([^/]+)\/role$/.exec(path)
  if (req.method === 'PUT' && roleMatch) {
    if (!requireAdmin(req, res)) return
    const name = decodeURIComponent(roleMatch[1])
    const body = await readBody(req)
    if (body.role !== 'admin' && body.role !== 'owner' && body.role !== 'user') {
      sendJson(res, 400, { message: '角色取值不合法' })
      return
    }
    const found = mockUsers.find((u) => u.username === name)
    if (!found) {
      sendJson(res, 404, { message: '用户不存在' })
      return
    }
    found.role = body.role
    if (name === sessionUser.username) {
      sessionUser = { ...sessionUser, role: body.role }
    }
    sendJson(res, 204, undefined)
    return
  }

  if (req.method === 'GET' && path === '/api/admin/invites') {
    if (!requireAdmin(req, res)) return
    sendJson(res, 200, inviteList)
    return
  }
  if (req.method === 'POST' && path === '/api/admin/invites') {
    if (!requireAdmin(req, res)) return
    const created: InviteCode = {
      code: `INVITE-${String(inviteList.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      usedBy: '',
    }
    inviteList.push(created)
    sendJson(res, 200, created)
    return
  }

  const inviteMatch = /^\/api\/admin\/invites\/([^/]+)$/.exec(path)
  if (req.method === 'DELETE' && inviteMatch) {
    if (!requireAdmin(req, res)) return
    const code = decodeURIComponent(inviteMatch[1])
    const index = inviteList.findIndex((i) => i.code === code)
    if (index >= 0) {
      inviteList.splice(index, 1)
    }
    sendJson(res, 204, undefined)
    return
  }

  if (req.method === 'GET' && path === '/api/admin/groups') {
    if (!requireAdmin(req, res)) return
    sendJson(res, 200, siteGroupData)
    return
  }
  if (req.method === 'POST' && path === '/api/admin/groups') {
    if (!requireAdmin(req, res)) return
    const body = await readBody(req)
    if (typeof body.name !== 'string' || !body.name || !Array.isArray(body.members)) {
      sendJson(res, 400, { message: '用户组字段不完整' })
      return
    }
    const maxId = Math.max(0, ...siteGroupData.map((g) => g.id))
    siteGroupData.push({ id: maxId + 1, name: body.name, members: body.members as string[] })
    sendJson(res, 200, siteGroupData)
    return
  }

  const siteGroupMatch = /^\/api\/admin\/groups\/(\d+)$/.exec(path)
  if (req.method === 'PUT' && siteGroupMatch) {
    if (!requireAdmin(req, res)) return
    const found = siteGroupData.find((g) => g.id === Number(siteGroupMatch[1]))
    if (!found) {
      sendJson(res, 404, { message: '用户组不存在' })
      return
    }
    const body = await readBody(req)
    if (typeof body.name !== 'string' || !body.name || !Array.isArray(body.members)) {
      sendJson(res, 400, { message: '用户组字段不完整' })
      return
    }
    found.name = body.name
    found.members = body.members as string[]
    sendJson(res, 200, siteGroupData)
    return
  }
  if (req.method === 'DELETE' && siteGroupMatch) {
    if (!requireAdmin(req, res)) return
    const index = siteGroupData.findIndex((g) => g.id === Number(siteGroupMatch[1]))
    if (index >= 0) {
      siteGroupData.splice(index, 1)
    }
    sendJson(res, 204, undefined)
    return
  }

  if (req.method === 'PUT' && path === '/api/admin/site-links') {
    if (!requireAdmin(req, res)) return
    const body = await readBody(req)
    if (typeof body.contact !== 'string' || typeof body.docs !== 'string' ||
        typeof body.contribute !== 'string' || typeof body.support !== 'string') {
      sendJson(res, 400, { message: '链接字段不完整' })
      return
    }
    siteLinkConfig = {
      contact: body.contact,
      docs: body.docs,
      contribute: body.contribute,
      support: body.support,
    }
    sendJson(res, 200, siteLinkConfig)
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
