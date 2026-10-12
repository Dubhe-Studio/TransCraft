<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { ApiError } from '../api/client'
import { followedProjects } from '../api/project'
import { supportedLanguages } from '../api/language'
import type { LanguageInfo, ProjectSummary } from '../api/types'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const followed = ref<ProjectSummary[]>([])
const languages = ref<LanguageInfo[]>([])
const followedFailed = ref(false)
const languagesFailed = ref(false)

async function loadFollowed() {
  try {
    followed.value = await followedProjects()
    followedFailed.value = false
  } catch (error) {
    console.error('加载关注的项目失败:', error)
    followedFailed.value = true
  }
}

async function loadLanguages() {
  try {
    languages.value = await supportedLanguages()
    languagesFailed.value = false
  } catch (error) {
    console.error('加载语言列表失败:', error)
    languagesFailed.value = true
  }
}

// 语言代码在接口数据缺失时直接展示代码本身
function languageName(code: string): string {
  return languages.value.find((lang) => lang.code === code)?.name ?? code
}

const primaryLanguage = computed(() => auth.user?.primaryLanguage ?? '')
const secondaryLanguages = computed(() => auth.user?.secondaryLanguages ?? [])
const otherLanguages = computed(() => {
  const used = new Set([primaryLanguage.value, ...secondaryLanguages.value])
  return languages.value.filter((lang) => !used.has(lang.code))
})
const currentLanguageLabel = computed(() =>
  ui.currentLanguage ? languageName(ui.currentLanguage) : '语言',
)

function chooseLanguage(code: string) {
  ui.setCurrentLanguage(code)
}

async function logout() {
  auth.logout()
  await router.replace({ name: 'login' })
}

onMounted(async () => {
  try {
    await auth.fetchMe()
    if (!ui.currentLanguage && auth.user?.primaryLanguage) {
      ui.setCurrentLanguage(auth.user.primaryLanguage)
    }
  } catch (error) {
    // 401 由全局处理器统一跳转登录页，这里只处理其余失败
    if (error instanceof ApiError && error.status === 401) {
      return
    }
    console.error('加载用户信息失败:', error)
    Message.error('加载用户信息失败')
  }

  await Promise.all([loadFollowed(), loadLanguages()])
})
</script>

<template>
  <a-layout class="shell">
    <a-layout-header class="shell__header">
      <div class="shell__left">
        <router-link to="/dashboard" class="shell__brand">
          <img src="/favicon.svg" alt="TransCraft" class="shell__logo" />
          <span class="shell__name">TransCraft</span>
        </router-link>

        <nav class="shell__nav">
          <router-link
            to="/dashboard"
            class="shell__nav-item"
            :class="{ 'shell__nav-item--active': route.name === 'dashboard' }"
          >
            Dashboard
          </router-link>

          <a-dropdown trigger="hover">
            <span class="shell__nav-item">项目 <icon-down /></span>
            <template #content>
              <a-doption v-if="followedFailed" @click="loadFollowed">加载失败，点击重试</a-doption>
              <a-doption v-else-if="followed.length === 0" disabled>暂无关注的项目</a-doption>
              <a-doption
                v-for="project in followed"
                :key="project.id"
                @click="router.push({ name: 'project-detail', params: { id: project.id } })"
              >
                {{ project.name }}
              </a-doption>
            </template>
          </a-dropdown>

          <a-dropdown trigger="hover">
            <span class="shell__nav-item">{{ currentLanguageLabel }} <icon-down /></span>
            <template #content>
              <a-dgroup v-if="primaryLanguage" title="首要语言">
                <a-doption @click="chooseLanguage(primaryLanguage)">
                  {{ languageName(primaryLanguage) }}
                </a-doption>
              </a-dgroup>
              <a-dgroup v-if="secondaryLanguages.length > 0" title="次要语言">
                <a-doption
                  v-for="code in secondaryLanguages"
                  :key="code"
                  @click="chooseLanguage(code)"
                >
                  {{ languageName(code) }}
                </a-doption>
              </a-dgroup>
              <a-dgroup v-if="otherLanguages.length > 0" title="其它语言">
                <a-doption v-for="lang in otherLanguages" :key="lang.code" @click="chooseLanguage(lang.code)">
                  {{ lang.name }}
                </a-doption>
              </a-dgroup>
              <a-doption v-if="languagesFailed" @click="loadLanguages">加载失败，点击重试</a-doption>
              <a-doption v-else-if="languages.length === 0 && !primaryLanguage" disabled>
                语言列表加载中
              </a-doption>
            </template>
          </a-dropdown>
        </nav>
      </div>

      <div class="shell__right">
        <router-link v-if="auth.canManage" to="/admin" class="shell__nav-item">管理</router-link>

        <a-tooltip :content="ui.theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'">
          <a-button type="text" shape="circle" aria-label="切换深浅色模式" @click="ui.toggleTheme()">
            <template #icon>
              <icon-sun v-if="ui.theme === 'dark'" />
              <icon-moon v-else />
            </template>
          </a-button>
        </a-tooltip>

        <a-dropdown trigger="hover">
          <span class="shell__nav-item"><icon-plus /> 添加</span>
          <template #content>
            <a-doption @click="router.push({ name: 'project-new' })">添加项目</a-doption>
            <a-doption @click="router.push({ name: 'component-new' })">添加部件</a-doption>
          </template>
        </a-dropdown>

        <a-dropdown trigger="hover">
          <a-avatar :size="28" class="shell__avatar">
            <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" :alt="auth.user.displayName" />
            <template v-else>{{ auth.user?.displayName?.charAt(0) ?? '?' }}</template>
          </a-avatar>
          <template #content>
            <a-doption
              :disabled="!auth.user"
              @click="router.push({ name: 'user-home', params: { name: auth.user?.username } })"
            >
              用户主页
            </a-doption>
            <a-doption @click="router.push({ name: 'settings' })">设置</a-doption>
            <a-doption @click="logout">退出登录</a-doption>
          </template>
        </a-dropdown>

        <a-dropdown trigger="hover">
          <span class="shell__nav-item"><icon-more /> 更多</span>
          <template #content>
            <!-- TODO: 联系管理员 / 文档 / 贡献 / 支持的目标链接待站点配置功能提供后接入；跟踪：TODO.md -->
            <a-doption disabled>联系管理员</a-doption>
            <a-doption disabled>文档</a-doption>
            <a-doption disabled>贡献</a-doption>
            <a-doption disabled>支持</a-doption>
            <a-doption @click="router.push({ name: 'about' })">关于</a-doption>
          </template>
        </a-dropdown>
      </div>
    </a-layout-header>

    <a-layout-content class="shell__content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<style scoped lang="scss">
.shell {
  min-height: 100%;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // 站点顶栏按 50px 设计
    height: 50px;
    padding: 0 24px;
    background-color: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border-2);
  }

  &__left,
  &__right,
  &__nav {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: var(--color-text-1);
  }

  &__logo {
    width: 24px;
    height: 24px;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
  }

  &__nav-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--color-text-2);
    text-decoration: none;
    cursor: pointer;
    font-size: 14px;

    &:hover,
    &--active {
      color: rgb(var(--primary-6));
    }
  }

  &__avatar {
    cursor: pointer;
    background-color: rgb(var(--primary-6));
  }

  &__content {
    padding: 24px;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
}
</style>
