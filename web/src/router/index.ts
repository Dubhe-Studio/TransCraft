import { createRouter, createWebHistory } from 'vue-router'
import { setUnauthorizedHandler } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { redirectTarget } from './redirect'
import MainLayout from '../layouts/MainLayout.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import DashboardPage from '../pages/DashboardPage.vue'
import ProjectNewPage from '../pages/ProjectNewPage.vue'
import ProjectDetailPage from '../pages/ProjectDetailPage.vue'
import ComponentNewPage from '../pages/ComponentNewPage.vue'
import PartTranslatePage from '../pages/PartTranslatePage.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import UserHomePage from '../pages/UserHomePage.vue'
import PlaceholderPage from '../pages/PlaceholderPage.vue'

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    requiresAuth?: boolean
    title?: string
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true, title: '登录' } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true, title: '注册' } },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: DashboardPage, meta: { title: 'Dashboard' } },
        { path: 'projects/new', name: 'project-new', component: ProjectNewPage, meta: { title: '添加项目' } },
        { path: 'projects/:id', name: 'project-detail', component: ProjectDetailPage, meta: { title: '项目详情' } },
        { path: 'components/new', name: 'component-new', component: ComponentNewPage, meta: { title: '添加部件' } },
        { path: 'parts/:id/translate', name: 'part-translate', component: PartTranslatePage, meta: { title: '翻译' } },
        // TODO: 以下均为用户确认的占位路由，对应功能落地后逐个替换为真实页面；跟踪 TODO.md 第一阶段
        { path: 'settings', name: 'settings', component: SettingsPage, meta: { title: '设置' } },
        { path: 'users/:name', name: 'user-home', component: UserHomePage, meta: { title: '用户主页' } },
        { path: 'admin', name: 'admin', component: PlaceholderPage, meta: { title: '管理' } },
        { path: 'about', name: 'about', component: PlaceholderPage, meta: { title: '关于' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  // 未登录访问受保护页面时记录目标地址，登录成功后跳回
  if (to.matched.some((record) => record.meta.requiresAuth) && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.isLoggedIn) {
    return { path: redirectTarget(to.query) }
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

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · TransCraft` : 'TransCraft'
})
