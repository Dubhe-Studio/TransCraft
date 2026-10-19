import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { setUnauthorizedHandler } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { i18n } from '@/i18n'
import { redirectTarget } from './redirect'
import MainLayout from '../layouts/MainLayout.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import DashboardPage from '../pages/DashboardPage.vue'
import ProjectNewPage from '../pages/ProjectNewPage.vue'
import ProjectDetailPage from '../pages/ProjectDetailPage.vue'
import ComponentNewPage from '../pages/ComponentNewPage.vue'
import PartDetailPage from '../pages/PartDetailPage.vue'
import PartLanguagePage from '../pages/PartLanguagePage.vue'
import PartTranslatePage from '../pages/PartTranslatePage.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import UserHomePage from '../pages/UserHomePage.vue'
import AdminPage from '../pages/AdminPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import ProjectsPage from '../pages/ProjectsPage.vue'

// 站点名固定不翻译，与页面标题以 " · " 连接
const SITE_NAME = 'TransCraft'

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
    // 标签页标题的 i18n 键，取值为路由自身语言下的页面名
    titleKey?: string
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true, titleKey: 'route.login' } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true, titleKey: 'route.register' } },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: DashboardPage, meta: { titleKey: 'route.dashboard' } },
        { path: 'projects/new', name: 'project-new', component: ProjectNewPage, meta: { titleKey: 'route.project_new' } },
        { path: 'projects', name: 'projects', component: ProjectsPage, meta: { titleKey: 'route.projects' } },
        { path: 'projects/:slug', name: 'project-detail', component: ProjectDetailPage, meta: { titleKey: 'route.project_detail' } },
        { path: 'components/new', name: 'component-new', component: ComponentNewPage, meta: { titleKey: 'route.component_new' } },
        // 部件与语言页面以 项目 slug + 部件 slug + 语言段 三级地址寻址，语言段形如 zh-CN
        { path: 'projects/:slug/parts/:partSlug', name: 'part-detail', component: PartDetailPage, meta: { titleKey: 'route.part_detail' } },
        { path: 'projects/:slug/parts/:partSlug/:lang', name: 'part-language', component: PartLanguagePage, meta: { titleKey: 'route.part_language' } },
        { path: 'projects/:slug/parts/:partSlug/:lang/translate', name: 'part-translate', component: PartTranslatePage, meta: { titleKey: 'route.part_translate' } },
        { path: 'settings', name: 'settings', component: SettingsPage, meta: { titleKey: 'route.settings' } },
        { path: 'users/:name', name: 'user-home', component: UserHomePage, meta: { titleKey: 'route.user_home' } },
        { path: 'admin', name: 'admin', component: AdminPage, meta: { titleKey: 'route.admin', requiresAdmin: true } },
        { path: 'about', name: 'about', component: AboutPage, meta: { titleKey: 'route.about' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 未登录访问受保护页面时记录目标地址，登录成功后跳回
  if (to.matched.some((record) => record.meta.requiresAuth) && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.isLoggedIn) {
    return { path: redirectTarget(to.query) }
  }
  // 管理页除后端 403 兜底外，前端按会话角色拦截，避免普通用户手输地址进入
  if (to.meta.requiresAdmin) {
    try {
      await auth.fetchMe()
    } catch (error) {
      console.error('校验管理权限失败:', error)
      return { name: 'dashboard' }
    }
    if (!auth.canManage) {
      return { name: 'dashboard' }
    }
  }
  return true
})

// token 失效（任意接口返回 401）时统一退出登录并跳回登录页；
// 登录/注册页上的 401 属于账号密码错误等业务反馈，不触发跳转
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  auth.logout()
  if (router.currentRoute.value.meta.guest) {
    return
  }
  void router.replace({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
})

// 标签页标题由路由的 i18n 键与当前界面语言共同决定，切换语言后同一页面也要重算
function applyDocumentTitle(titleKey?: string): void {
  document.title = titleKey ? `${i18n.global.t(titleKey)} · ${SITE_NAME}` : SITE_NAME
}

router.afterEach((to) => {
  applyDocumentTitle(to.meta.titleKey)
})

watch(i18n.global.locale, () => {
  applyDocumentTitle(router.currentRoute.value.meta.titleKey)
})
