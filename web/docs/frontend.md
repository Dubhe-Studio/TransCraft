# TransCraft 前端工程说明

本文档面向需要接手、评审或扩展 `web/` 目录的开发者，说明这个 Vue 3 工程的结构、分层约定、前后端契约与权限口径，并记录当前已确认的问题与未完成项。

## 一、工程定位

TransCraft 是面向 Minecraft 模组社区的协作翻译管理平台。用户创建项目，在项目下添加「部件」，把仓库里的语言文件（平铺 JSON，形如 `{"item.create.wrench": "扳手"}`）导入为翻译条目，再逐语言翻译、校对与跟踪进度。

`web/` 是整套系统的前端。它与 Go + Hertz 后端同源部署：`vite build` 的产物直接输出到 `../internal/webassets/dist`，由 `internal/webassets/assets.go` 嵌入进 Go 二进制。前端所有请求走相对路径 `/api`，因此没有跨域配置，也没有独立的部署流程。

需要特别注意的是当前所处的阶段。后端目前只实现了 `/ping` 与 `/api/health`（见 `internal/httpapi/router.go`），`/api` 下的业务路由尚未落地。前端定义的接口契约由 `mock/api.ts` 这个 Vite 中间件模拟承担，页面在无后端的情况下可以完整走通交互。因此 `src/api/` 与 `mock/api.ts` 共同构成了事实上的接口约定，后续后端实现应以它们为准。

## 二、技术栈与命令

| 项目 | 版本 | 说明 |
| --- | --- | --- |
| Vue | 3.5 | 全部使用 `<script setup lang="ts">` 组合式 API |
| TypeScript | 6.0 | 严格模式，开启 `noUnusedLocals` / `noUnusedParameters` |
| Vite | 8.3 | 构建工具，`mock/api.ts` 以插件形式挂到 dev server |
| Arco Design Vue | 2.58 | 组件库，全量注册 `ArcoVue` 与 `ArcoVueIcon` |
| vue-i18n | 11.4 | 界面多语言，语言包在 `src/locale/`，机制见 `docs/i18n.md` |
| Pinia | 4.0 | 状态管理：`auth`、`ui`，以及定义在 `src/i18n/index.ts` 的界面语言 `locale` |
| Vue Router | 5.4 | `createWebHistory` 模式 |
| sass-embedded | 1.105 | SCSS 编译，各组件用 `<style scoped lang="scss">` |

包管理一律使用 pnpm，不要用 npm 或 yarn，否则 `pnpm-lock.yaml` 会漂移。

```bash
pnpm dev        # 启动开发服务器，默认接管 /api（Mock 模式）
pnpm build      # vue-tsc -b 类型检查 + vite build，产物写入 ../internal/webassets/dist
pnpm preview    # 预览构建产物
```

Mock 的开关由 `vite.config.ts` 读取环境变量决定：

- 默认（`MOCK_API` 不为 `false`）：注册 `mockApi()` 插件，`/api/*` 由 Mock 中间件应答，不配置代理。
- `MOCK_API=false`：不注册 Mock，开启 Vite 代理把 `/api` 转发到 `http://127.0.0.1:8080`，即真实后端。

Mock 模式下任意非空账号密码都能登录，令牌固定为 `mock-token`，演示用户 `translator` 的角色是 `admin`，便于看到全部菜单项。

`vite.config.ts` 同时把 `@` 别名指向 `src`（`tsconfig.app.json` 里也配了同名 `paths`），但现有源码基本使用相对路径导入，`@` 别名实际只作为备用。

## 三、目录结构与职责

```
web/
├─ index.html              单页入口，挂载点 #app
├─ vite.config.ts          构建、别名、Mock 开关与后端代理、产物输出目录
├─ mock/api.ts             开发期 Mock 后端（1375 行，覆盖全部契约）
├─ public/                 favicon.svg、icons.svg
└─ src/
   ├─ main.ts              应用装配：Pinia → 主题初始化 → Router → Arco → i18n → 挂载
   ├─ App.vue              仅一个 <router-view />
   ├─ router/
   │  ├─ index.ts          路由表、鉴权守卫、401 统一处理、标题设置
   │  └─ redirect.ts       登录回跳地址的白名单校验
   ├─ stores/
   │  ├─ auth.ts           令牌与当前用户，登录/登出/补拉用户信息
   │  └─ ui.ts             当前工作语言与深浅色主题
   ├─ api/
   │  ├─ client.ts         fetch 封装：Bearer 头、JSON 编解码、ApiError 规范化
   │  ├─ types.ts          全部领域类型与接口出入参
   │  ├─ auth.ts user.ts project.ts part.ts group.ts admin.ts site.ts language.ts
   ├─ i18n/index.ts        界面语言：vue-i18n 实例、语言表与 useLocaleStore
   ├─ locale/              zh.json、en.json 语言包，index.ts 聚合并导出 LocaleCode
   ├─ layouts/MainLayout.vue  顶栏 + 内容区外壳
   ├─ pages/               14 个页面组件
   ├─ components/          3 个复用组件
   ├─ styles/              index.scss（全局）、auth.scss（登录注册共用）
   ├─ slug.ts              地址标识的格式规则（前后端共用口径）
   └─ langSegment.ts       语言代码与地址段的互转
```

分层方向是单向的：`pages` → `components` / `stores` / `api` → `client`。`client.ts` 不反向依赖 router，401 的跳转行为由 `router/index.ts` 通过 `setUnauthorizedHandler` 注入，避免循环依赖。

## 四、启动装配顺序

`main.ts` 的顺序不是随意的：

```ts
const app = createApp(App)
app.use(createPinia())
useUiStore().initTheme()   // 首帧渲染前应用主题，避免深浅色闪烁
app.use(router)
app.use(ArcoVue)
app.use(ArcoVueIcon)
app.use(i18n)
app.mount('#app')
```

`initTheme` 必须在 `mount` 之前执行，否则会先渲染浅色再切深色。它一次完成三件事：读取本地主题记录；本地没有记录时跟随 `prefers-color-scheme`；注册系统主题变化监听，但用户手动选择过主题后该监听不再生效。

## 五、路由与寻址

### 路由表

| 路径 | 名称 | 说明 |
| --- | --- | --- |
| `/login` | login | 游客页 |
| `/register` | register | 游客页 |
| `/dashboard` | dashboard | 关注的项目与进度 |
| `/projects` | projects | 站点全部项目，三种排序 |
| `/projects/new` | project-new | 添加项目 |
| `/projects/:slug` | project-detail | 项目详情（部件/成员/用户组/设置四个页签） |
| `/components/new` | component-new | 添加部件 |
| `/projects/:slug/parts/:partSlug` | part-detail | 部件详情（语言/成员） |
| `/projects/:slug/parts/:partSlug/:lang` | part-language | 部件 × 语言页，翻译工作台入口 |
| `/projects/:slug/parts/:partSlug/:lang/translate` | part-translate | 翻译工作台 |
| `/settings` | settings | 个人资料与账号安全 |
| `/users/:name` | user-home | 用户主页 |
| `/admin` | admin | 管理后台（`requiresAdmin`） |
| `/about` | about | 关于 |
| `/:pathMatch(.*)*` | — | 兜底重定向到 `/` |

除登录与注册外，全部路由挂在 `MainLayout` 之下，父路由带 `meta.requiresAuth`。`RouteMeta` 通过 `declare module 'vue-router'` 扩展了 `guest`、`requiresAuth`、`requiresAdmin`、`title` 四个字段。

### 三级地址寻址

项目与部件都不以数字 id 出现在地址里，而是用可配置的 `slug`：

```
/projects/<项目slug>/parts/<部件slug>/<语言段>/translate
```

这样做的目的是让地址稳定可读、可被外部引用，即使后端主键变化也不影响链接。代价是页面必须先用 slug 换取 id 才能调用其余按 id 寻址的接口，`ProjectDetailPage`、`PartDetailPage`、`PartLanguagePage`、`PartTranslatePage` 都遵循「先解析 slug → 再按 id 并发取数」的模式。

slug 的格式规则集中在 `src/slug.ts`，只允许小写字母、数字、点与连字符，必须以字母或数字开头，最长 60 字符。`mock/api.ts` 直接 `import` 了这份规则而不是复制一遍，保证前后端口径不会各自漂移。slug 在设置页与部件配置弹窗里可以被修改，修改成功后页面用 `router.replace` 把地址换成新标识，历史记录里不留旧地址。

### 语言段与语言代码的互转

存储口径是 Minecraft 风格的 `zh_cn`，地址段沿用 BCP 47 习惯的 `zh-CN`，转换由 `src/langSegment.ts` 承担：

```ts
toLangSegment('zh_cn')      // 'zh-CN'
fromLangSegment('zh-CN')    // 'zh_cn'
```

注释里明确了一个限制：契约只覆盖「主语言_地区」两段式代码，三段式（如 `zh_Hant_TW`）不在支持范围。平台语言列表也确实全是两段式。

### 守卫与 401 处理

`beforeEach` 做三件事：未登录访问受保护页面时带上 `redirect` 参数跳登录页；已登录用户访问 `guest` 页面时跳回 `redirectTarget` 指向的地址；`requiresAdmin` 的路由先 `fetchMe` 再据 `canManage` 判定，普通用户手输 `/admin` 会被挡回 dashboard。前端这道拦截只是体验优化，真正的权限仍以后端返回 403 兜底。

`redirectTarget` 只接受以 `/` 开头且不以 `//` 开头的站内路径，后者是协议相对地址，指向站外，必须排除，否则会形成开放重定向。

`setUnauthorizedHandler` 注册的回调在任意接口返回 401 时触发，统一登出并带着当前地址跳回登录页。这里有一个刻意的例外：当前路由带 `meta.guest` 时（即已经在登录页或注册页）不跳转，因为此时 401 表示账号密码错误一类的业务反馈，应该在原页面用消息提示。

`afterEach` 设置 `document.title`，格式为 `页面标题 · TransCraft`，没有标题时回退为 `TransCraft`。

### 组件重挂载策略

`MainLayout` 给内容区的 `<router-view>` 绑定了 `:key="route.fullPath"`，让不同路由参数之间的切换强制整页重挂载，避免组件复用导致的旧数据残留。代价是页面无法在同参数不同查询串之间保留本地状态，这是当前的取舍。

即便如此，各页面仍然保留了自己的竞态保护，原因见第八节。

## 六、状态管理

只有两个 store，都使用 setup 语法。

`stores/auth.ts` 管理 `token` 与 `user`。令牌的权威来源是 `localStorage` 的 `transcraft_token`，store 初始化时直接从本地读取，刷新页面后令牌仍在但 `user` 为空，因此需要 `fetchMe()` 重新拉取（路由守卫与管理页会触发，`MainLayout` 挂载时也会调用）。`fetchMe` 有短路逻辑：没有令牌或已有用户时直接返回，避免重复请求。`canManage` 计算属性只认 `admin` 与 `owner` 两个站点角色，决定顶栏「管理」入口是否显示。

`stores/ui.ts` 管理两项跨页面偏好，都落 `localStorage`：

- `currentLanguage`（键 `transcraft_language`）：顶栏语言菜单选中的工作语言，影响仪表盘、项目详情、翻译页的取数语言。初次进入时若本地为空，`MainLayout` 会用用户的首要语言初始化。
- `theme`（键 `transcraft_theme`）：`light` 或 `dark`。深色通过给 `body` 加 `arco-theme="dark"` 属性实现，Arco 会据此把整套 CSS 变量切到深色配色。

## 七、API 层与接口契约

### 统一入口

`api/client.ts` 提供 `get` / `post` / `put` / `del` 四个函数，内部统一处理四件事：拼接 `/api` 前缀；有令牌时附加 `Authorization: Bearer <token>`；请求体存在时序列化为 JSON 并设置 `Content-Type`；`resp.ok` 为假时抛出 `ApiError`。

`ApiError` 携带 `status` 与 `message`，消息优先取响应体里的 `message` 字段，读不出来时回退为 `请求失败（HTTP <状态码>）`。解析失败会 `console.warn` 记录，不会静默吞掉。状态码为 204 时返回 `undefined`，不做 JSON 解析。所有 401 都会触发上面提到的全局处理器。

各业务模块只做路径拼接与类型标注，不含逻辑。路径段一律经 `encodeURIComponent` 处理，查询参数经 `encodeURIComponent` 编码。

### 完整接口清单

下表即前端依赖的全部契约。标注「公开」的接口不需要令牌，其余均需 `Authorization` 头；管理接口额外要求站点角色为 `admin`。响应体类型见 `src/api/types.ts`。

认证与用户：

| 方法 | 路径 | 出入参 |
| --- | --- | --- |
| POST | `/api/auth/login` | `{account, password}` → `LoginResult` |
| POST | `/api/auth/register` | `{username, email, password, emailCode, inviteCode?}` → `LoginResult` |
| POST | `/api/auth/email-code` | `{email}` → 204 |
| GET | `/api/auth/register-config` | 公开 → `{inviteRequired}` |
| GET | `/api/users/me` | → `UserProfile` |
| PUT | `/api/users/me` | `ProfileInput` → `UserProfile` |
| POST | `/api/users/me/password` | `{oldPassword, newPassword}` → 204 |
| GET | `/api/users/{username}` | → `UserPublicProfile` |
| GET | `/api/languages` | 公开 → `LanguageInfo[]` |

项目：

| 方法 | 路径 | 出入参 |
| --- | --- | --- |
| GET | `/api/projects?sort=name` | 另有 `creator`、`activity` 两个取值，→ `ProjectSummary[]` |
| POST | `/api/projects` | `ProjectInput` → `ProjectDetail` |
| GET | `/api/projects/followed` | → `ProjectSummary[]` |
| GET | `/api/projects/followed/progress?lang=` | → `ProjectProgress[]` |
| GET | `/api/projects/{id 或 slug}` | → `ProjectDetail` |
| PUT | `/api/projects/{id}` | `ProjectInput` → `ProjectDetail` |
| GET | `/api/projects/{id}/progress?lang=` | → `PartProgress[]` |
| GET | `/api/projects/{id 或 slug}/languages` | → `LanguageProgress[]` |
| GET/POST | `/api/projects/{id}/members` | → `ProjectMember[]`；体为 `{username, role}` |
| DELETE | `/api/projects/{id}/members/{username}` | → 204 |
| GET/POST | `/api/projects/{id}/groups` | → `ProjectGroup[]`；体为 `ProjectGroupInput` |
| PUT/DELETE | `/api/projects/{id}/groups/{groupId}` | → `ProjectGroup[]` / 204 |

部件与翻译条目：

| 方法 | 路径 | 出入参 |
| --- | --- | --- |
| POST | `/api/parts` | `PartInput` → `Part` |
| GET/PUT | `/api/parts/{id}` | → `PartDetail`；PUT 体为 `PartInput` |
| GET | `/api/parts/{id}/languages` | → `LanguageProgress[]` |
| GET | `/api/projects/{项目slug}/parts/{部件slug}` | → `PartDetail` |
| GET | `/api/projects/{项目slug}/parts/{部件slug}/languages` | → `LanguageProgress[]` |
| GET/POST | `/api/parts/{id}/members` | → `PartMember[]`；体为 `{username, role}`，`role` 取 `maintainer` 或 `translator` |
| DELETE | `/api/parts/{id}/members/{username}` | → 204 |
| GET/POST | `/api/parts/{id}/languages/{lang}/members` | → `LanguageMember[]`；体为 `{username, role}`，`role` 取 `proofreader` 或 `translator` |
| DELETE | `/api/parts/{id}/languages/{lang}/members/{username}` | → 204 |
| GET | `/api/parts/{id}/entries?lang=` | → `TranslationEntry[]` |
| PUT | `/api/parts/{id}/entries/{key}?lang=` | `{text}` → 204 |
| POST | `/api/parts/{id}/entries/{key}/approve?lang=` | → 204 |
| POST | `/api/parts/{id}/entries/{key}/suggestions?lang=` | `{text}` → 204 |

站点管理：

| 方法 | 路径 | 出入参 |
| --- | --- | --- |
| GET | `/api/site/links` | 公开 → `SiteLinks` |
| PUT | `/api/admin/site-links` | `SiteLinks` → `SiteLinks` |
| GET | `/api/admin/users` | → `AdminUser[]` |
| PUT | `/api/admin/users/{username}/role` | `{role}` → 204 |
| GET/POST | `/api/admin/invites` | → `InviteCode[]` / `InviteCode` |
| DELETE | `/api/admin/invites/{code}` | → 204 |
| GET/POST | `/api/admin/groups` | → `SiteGroup[]`；体为 `SiteGroupInput` |
| PUT/DELETE | `/api/admin/groups/{id}` | → `SiteGroup[]` / 204 |

契约里有几条约定容易被忽略，实现后端时需要留意：

- 项目详情的 GET 同时接受数字 id 与 slug，但所有变更接口（PUT/DELETE）只按数字 id 寻址，slug 不参与写操作。
- 进度类接口的结果与查询参数 `lang` 强相关，前端在切换工作语言时会重新拉取。
- `PUT /entries/{key}` 保存译文后，服务端应使该条目原有的批准结论失效（Mock 里表现为删除 `savedApproved` 记录）。前端本地也会把 `approved` 置为 `false`。
- 部件详情的 `canApprove` 由服务端计算下发，前端不做二次推断。
- `Part.fileMask` 与 `Part.templatePath` 为空串表示「从项目同步」，非空才是部件级自定义值。

## 八、领域概念与权限模型

### 概念层级

项目（Project）下挂部件（Part），部件对应仓库中 `assets/<namespace>` 的一个命名空间，VCS 配置（仓库地址、分支、可选 fork）在部件级管理。项目级保存语言文件掩码与翻译模板路径，部件可以选择同步或自定义，这个选择在界面上表现为「从项目同步 / 部件自定义」单选，提交时同步项被规范化成空串。

翻译条目（TranslationEntry）结构固定为 `{key, source, primary, target, approved}`：`source` 是参考语言原文（始终下发），`primary` 是当前用户第一语言下的既有译文（作为对照，空串表示无），`target` 是当前语言译文（空串表示未翻译）。

进度统计 `ProgressStats` 有八个口径：已翻译百分比、未完成条数、未完成的词数、未完成的字符数、未翻译条数、检查未通过数、建议数、评论数。`ProgressRow = ProgressStats & {id, name}` 是共用进度表接受的行形态，项目进度与部件进度都满足它。

### 四层角色

权限模型分四层，各层的角色枚举与用途并不相同：

| 层级 | 类型 | 取值 | 实际用途 |
| --- | --- | --- | --- |
| 站点 | `UserRole` | `admin` / `owner` / `user` | `admin` 与 `owner` 可见管理入口、可访问 `/admin` |
| 项目 | `ProjectRole` | `owner` / `maintainer` / `translator` | `owner` 与 `maintainer` 可见项目设置、成员、用户组页签，可编辑部件，可批准译文 |
| 部件 | `PartRole` | `maintainer` / `translator` | 仅作成员角色展示 |
| 语言 | `LanguageRole` | `proofreader` / `translator` | 仅作成员角色展示 |

这里有一个必须澄清的事实：**部件级与语言级成员角色目前不参与任何权限判定**。`LanguageRole` 在整个 `src/` 中只出现于 `api/types.ts` 与 `api/part.ts`，没有任何组件或守卫读取它。前端所有管理入口的显隐都由项目角色（`detail.role === 'owner' || 'maintainer'`）决定，批准权限则完全依赖服务端下发的 `PartDetail.canApprove`。按 `types.ts` 的注释，`canApprove` 的语义是「所有者/维护者，或所属项目中拥有 `approve` 权限的用户组成员」，Mock 的判定逻辑与此一致。

因此把某个用户配置为某语言的 `proofreader`，在当前实现里既不会让它看到额外入口，也不会解锁批准按钮。这属于已交付但未接线的能力，扩展权限体系时需要一并考虑是接线还是删除。

前端的路由守卫只保证「已登录」，不校验项目或部件级权限。任何登录用户直接输入 `/projects/<slug>/parts/<partSlug>/<lang>/translate` 都能进入翻译工作台并保存译文。这在协作翻译场景下可能是刻意的设计（任何登录用户都可以贡献译文），但需要后端在写入时确认这一口径，否则就是一个未声明的越权面。

### 用户组

项目级用户组（`ProjectGroup`）的 `permissions` 是权限标识列表，目前界面只支持一个取值 `approve`（批准译文），在表单里表现为一个复选框，提交时展开成 `['approve']` 或 `[]`。站点级用户组（`SiteGroup`）的注释明确写了「只做成员归组展示，不参与权限判定」，界面上也确实只有名称与成员两个字段。

## 九、页面说明

Dashboard（`pages/DashboardPage.vue`）展示关注项目的进度表，是本项目的默认落地页。点击行按 slug 进入项目详情。数据随 `ui.currentLanguage` 变化重新拉取。

全部项目（`pages/ProjectsPage.vue`）列出站点所有项目，支持按名称、创建者、最后贡献时间三种排序（由 `sort` 查询参数驱动）。列表项的「最后贡献」把 UTC ISO 串转成本地日期显示，避免直接截断字符串造成日期偏差。

添加项目（`pages/ProjectNewPage.vue`）与添加部件（`pages/ComponentNewPage.vue`）是表单页。部件表单的所属项目下拉只列出「关注的项目」，并支持通过 `?project=<id>` 查询参数预选（从项目详情页跳过来时会带上）。表单校验在提交时用 `validSlug` 复核一次，不依赖 Arco 的 `required` 规则，原因是 `projectId` 初值为数字 0 而 `required` 会把 0 视为已填，必须另行拦截。

项目详情（`pages/ProjectDetailPage.vue`，571 行，工程内最大的页面）有四个页签：部件、成员、用户组、设置。后三个页签仅在项目角色为 owner 或 maintainer 时出现。部件页签内含语言选择器、部件进度表、各语言完成情况，以及复用同一弹窗的部件编辑入口。设置页签把「基本信息」与「文件」分组，并在 slug 变更后 `router.replace` 新地址。

部件详情（`pages/PartDetailPage.vue`）有语言与成员两个页签。语言页签把各语言完成情况渲染成可点击列表，点击进入该语言的页面；成员页签可增删部件级成员。

部件 × 语言页（`pages/PartLanguagePage.vue`）展示单语言的完成度卡片与语言成员，并提供「进入翻译」按钮。地址中的语言若不在部件的语言列表里，会直接以「该部件暂无此语言的文件」报错并给出重试入口。

翻译工作台（`pages/PartTranslatePage.vue`，549 行）是核心页面。上方是编辑器面板（键名、模板语言原文、第一语言对照、当前译文输入框与操作按钮），下方是可筛选的条目列表。操作按钮按权限显隐：保存并继续、保存并停留、批准（仅 `canApprove` 时出现且已批准时禁用）、建议、跳过。

设置（`pages/SettingsPage.vue`）分个人资料与账号安全两个页签。个人资料表单跟随 `auth.user` 填表并设 `immediate: true`，因为刷新直达设置页时会话用户可能晚于本页挂载到达。保存成功后用 `auth.applyLogin` 把新资料写回 store，保持顶栏头像与显示名同步。

管理后台（`pages/AdminPage.vue`）有用户管理、邀请码、用户组、站点链接四个页签。站点链接留空表示顶栏「更多」菜单不展示该项，保存后需重新进入站点才生效，这条提示直接写在了成功消息里。

登录（`pages/LoginPage.vue`）与注册（`pages/RegisterPage.vue`）共用 `styles/auth.scss` 的居中卡片布局。注册页在挂载时查询 `register-config` 决定是否显示邀请码字段；发送邮箱验证码后进入 60 秒倒计时，组件卸载时清理定时器。若注册配置拉取失败，页面会提示「邀请码要求以提交时服务端校验为准」并继续，不阻塞注册流程。

关于页（`pages/AboutPage.vue`）是静态文案。

## 十、复用组件

`components/ProgressTable.vue` 被仪表盘与项目详情共用，渲染「名称 + 八项统计 + 行内进度条」。表头文案由 `nameLabel` 属性决定（「项目」或「部件」）；名称列支持 `name` 具名插槽，项目详情页用它插入「编辑」按钮；行点击抛 `rowClick` 事件。已翻译 100% 的行不显示百分比数字，改显示一个对勾图标。

`components/LanguageProgress.vue` 渲染单语言的进度条与「未完成 X / 共 Y 条」，`link` 为真时行可点击并抛 `rowClick`。它同时被项目详情、部件详情、语言页和翻译页的「完成情况」气泡复用。

`components/PartEditModal.vue` 是部件配置弹窗，被项目详情的部件列表与部件详情页共用，目的是避免两份表单逻辑漂移。交互约定是：父级把要编辑的部件赋给 `part` 属性即触发弹窗打开（组件内部 `watch` 该属性并填表），保存成功以 `saved` 事件回传最新数据，关闭时以 `closed` 事件通知父级清空编辑目标，从而保证同一部件能再次打开。

弹窗类的提交统一把 `onBeforeOk` 绑定到返回 `Promise<boolean>` 的函数，校验失败或请求失败时返回 `false` 保持弹窗打开，成功才返回 `true` 关闭。整个工程有六处遵循这个约定。

## 十一、Mock 后端

`mock/api.ts` 是一个 Vite 插件，在 `configureServer` 阶段把处理函数挂到 dev server 中间件上，只接管 `/api/` 开头的请求，其余交给 Vite 自身（因此页面刷新、HMR、静态资源都不受影响）。

Mock 的行为刻意贴近真实后端，以便前端逻辑在接入时不需要改动：

- 需要登录的接口校验 `Authorization: Bearer mock-token`，不通过返回 401 `{message: '未登录或会话过期'}`。
- 管理接口在令牌之外还检查会话用户角色，不足时返回 403。
- 校验失败分别使用 400（字段不完整）、404（对象不存在）、409（slug 冲突、成员重复）三档状态码，前端 `ApiError` 能拿到这些状态。
- 内存里保存了 3 个项目、3 个部件、若干成员、用户组、邀请码与站点链接，以及每个部件的翻译条目。译文保存、批准、建议都真实写入内存，刷新页面后仍在，重启 dev server 才复位。
- 统计数据是示意值，与条目真实数量不追求严格对应；简体中文的百分比按条目实测计算，其余语言取预设示意值。
- 保存译文会顺带刷新所属项目的 `lastContributionAt`，用于演示按活动排序。
- `siteLinkConfig.support` 预置为空串，用于演示「更多」菜单对未配置项的隐藏。

修改接口契约时应当同时更新 `src/api/` 与 `mock/api.ts`，以及在 `TODO.md` 里记录进度，否则两边会迅速失配。

## 十二、样式与主题

全局样式只有 `styles/index.scss` 与 `styles/auth.scss`。前者设置字体族、`html/body/#app` 满高、`box-sizing: border-box`，以及页面底色。底色这里有一个必须注意的细节：深色下 `fill` 系变量是半透明白色叠加层，直接用 `--color-fill-2` 会失效，因此深色模式单独用实色的 `--color-bg-1`：

```scss
body { background-color: var(--color-fill-2); }

body[arco-theme='dark'] {
  background-color: var(--color-bg-1);
}
```

组件样式一律用 `<style scoped lang="scss">`，配合 SCSS 的 `&__element` 嵌套写法组织 BEM 风格类名，块名与组件文件名对应（如 `.progress-table`、`.part-language`）。

颜色遵循仓库规范，优先使用 Arco 的 CSS 变量（`var(--color-bg-2)`、`var(--color-text-1)`、`var(--color-border)`、`rgb(var(--primary-6))`、`rgb(var(--success-6))`），这样深浅色主题自动适配。现有代码没有出现写死的颜色值。

需要注意 `body[arco-theme='dark']` 这类选择器写在 scoped 样式里会因作用域属性而匹配不到，只应出现在全局样式文件中，或配合 `:deep()` 使用。

## 十三、工程内已确立的关键约定

以下模式在多处重复出现，属于这个工程的既有约定，修改代码时应保持一致。

**请求竞态用递增序号守卫。** 这是全工程最普遍的写法，出现在 `DashboardPage`、`ProjectDetailPage`（两处，详情与部件进度各一个序号）、`PartDetailPage`、`PartLanguagePage`、`PartTranslatePage`、`ComponentNewPage` 共七处。模式是每次发起请求前 `const seq = ++loadSeq`，拿到响应后先判断 `if (seq !== loadSeq) return`，`finally` 里也只在序号未过期时才结束 loading：

```ts
let loadSeq = 0
async function load() {
  const seq = ++loadSeq
  loading.value = true
  try {
    const data = await fetchSomething()
    if (seq !== loadSeq) return
    // 写入响应式状态
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}
```

之所以在 `router-view` 已经按 `fullPath` 重挂载的前提下还要写这个，是因为语言切换、项目切换等场景不会改变 `fullPath` 触发重挂载，只是重新取数，此时旧响应仍可能晚于新响应到达。

**错误一律显式处理，不静默吞掉。** 每个 `catch` 都做两件事：`console.error` 输出带上下文的日志，以及通过 `Message.error` 或 `loadError` 给用户可见的反馈。用户可见文案的模式是 `error instanceof Error ? error.message : '兜底文案'`，这样能透出后端返回的具体原因（`ApiError` 的 `message`）。全局 401 是唯一在页面内提前返回的情形。

**接口返回整表而非单项。** 成员与用户组的增删改接口都返回更新后的完整列表，前端直接整体替换 `memberList` / `groupList`，不做本地增删拼装。这样能避免前后端排序或过滤规则不一致导致的显示错乱。

**状态枚举都有中文标签映射。** 项目中定义了四份 `roleLabels`（分别在 `ProjectDetailPage`、`PartDetailPage`、`PartLanguagePage`、`AdminPage`），以 `Record<Role, string>` 的形式集中管理，模板里直接查表而非写条件分支。

**注释解释为什么。** 源码中的注释密度较高，但基本都在说明动机与约束而非复述代码，例如为什么 `initTheme` 要在挂载前调用、为什么同步开关打开时提交空串、为什么 `required` 拦不住 `projectId` 的 0。新增代码应延续这个标准。

## 十四、已确认的问题与风险

以下问题是本次分析中通过读代码确认的，按严重程度排列。

**翻译条目列表的排序与注释相反（`pages/PartTranslatePage.vue:42-44`）。** 代码是：

```ts
const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => Number(!a.target) * -1 + Number(!b.target))
})
```

注释写的是「未翻译条目靠前」，实际效果相反。`Number(!a.target)` 在 `a` 未翻译时为 1，乘以 -1 得 -1，比较器返回负数意味着 `a` 排在 `b` 前面，所以翻译器的结果是**已翻译条目排在前面、未翻译条目沉底**。另外这个比较器读起来有歧义，`Number(!a.target) * -1 + Number(!b.target)` 中 `b` 的项没有取负，实际等价于期望比较器的相反数。

这个缺陷不影响功能正确性，因为 `nextUntranslated()` 是在 `filteredEntries` 上独立查找的，不依赖排序结果；但列表的展示顺序与设计意图不符，而默认选中的是第一条未翻译条目，用户会在列表顶部看到已翻译内容、选中的条目却在下方。

**`PartEditModal` 的样式声明与模板类名不匹配（`components/PartEditModal.vue:125-189`）。** 模板里给元素写的是 `class="part-edit__group-title"` 这类完整类名，而样式块定义的是嵌套选择器：

```scss
.part-edit {
  &__group-title { margin: 8px 0 12px; }
}
```

编译产物是 `.part-edit .part-edit__group-title`，而模板中没有任何元素带 `part-edit` 这个类，弹窗根节点也没有传 `class` 属性（对比 `AdminPage` 的 `.admin__links` 写在页面根节点上、能正常生效）。因此这些样式实际未应用：两个分组标题缺少上下边距，同步值与自定义输入框缺少 `margin-top: 8px` 和换行处理。表现上是弹窗分组略挤、长路径可能不换行。修复方式是把依赖嵌套的样式改为平铺写法，或给 `a-modal` 传 `class="part-edit"`。

**语言级 `proofreader` 角色未接线。** 详见第八节。它已被完整实现于类型与接口层、可配置、可在界面展示，但不影响任何权限判定。

**建议功能只有提交入口。** `api/part.ts:81` 留了 TODO，说明建议的浏览与处理界面尚未实现，完成条件是「有批准权限的成员能查看并采纳/驳回建议」。当前用户提交的建议会写入 `suggestionList`（Mock 中记录了提交人、正文与时间），但没有任何界面能读出来。`ProgressStats.suggestions` 只在进度表里显示为一个数字。`TODO.md` 也把这一项列为「待实现」。

**进度统计中的「评论」永远为 0。** `ProgressStats.comments` 有字段、有列、Mock 里恒为 0，也没有任何评论相关的接口或界面。

## 十五、未完成与后续工作

按 `TODO.md`，前端第一阶段页面已全部实现并通过 Mock 联调，各项尚不能勾选的原因是后端尚未实现，而不是前端未交付。当前明确待办是建议的浏览与处理界面，详见上一节。

从代码看还有几处值得后续处理：

`main.ts` 全量注册了 `ArcoVue` 与 `ArcoVueIcon`，没有按需引入。当前包体规模下问题不大，但 Arco 全量组件加全量图标对首屏体积有实际影响，是后续优化构建产物的第一个着手点。

界面多语言的机制已经就位（vue-i18n 与 `src/locale/` 语言包，见 `docs/i18n.md`），但文案只迁移了顶栏、登录页、仪表盘与进度表，其余页面仍是中文字面量，包括 `Message.error` 的提示语，因此切到英文会出现中英混合。后续新增或改动页面时顺手把文案抽进语言包，并补齐 `zh` 与 `en` 两份。

`stores/ui.ts` 的 `initTheme` 里注册的系统主题变化监听没有对应的移除逻辑。这在应用生命周期内不会造成泄漏（单次调用），但若将来需要在组件中重复调用该方法就需要处理。

`App.vue` 是一个空的 `<script setup lang="ts">` 加单个 `<router-view />`，空的 script 块没有实际作用，可以删除。
