<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { ApiError } from '../api/client'
import { followedProjects } from '../api/project'
import { supportedLanguages } from '../api/language'
import { siteLinks } from '../api/site'
import type { LanguageInfo, ProjectSummary, SiteLinks } from '../api/types'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useLocaleStore } from '@/i18n'
import { useI18n } from "vue-i18n";

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const localeStore = useLocaleStore()

const followed = ref<ProjectSummary[]>([])
const languages = ref<LanguageInfo[]>([])
const followedFailed = ref(false)
const languagesFailed = ref(false)
// 顶栏"更多"菜单的外链，未配置的项不展示
const links = ref<SiteLinks>({ contact: '', docs: '', contribute: '', support: '' })

async function loadSiteLinks() {
  try {
    links.value = await siteLinks()
  } catch (error) {
    console.error('加载站点链接失败:', error)
  }
}

function openLink(url: string) {
  window.open(url, '_blank', 'noopener')
}

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
    Message.error(t('menubar.load_user_info_failed'))
  }

  await Promise.all([loadFollowed(), loadLanguages(), loadSiteLinks()])
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
            {{ $t('menubar.dashboard') }}
          </router-link>

          <a-dropdown trigger="hover">
            <span class="shell__nav-item">{{ $t('menubar.project') }} <icon-down /></span>
            <template #content>
              <a-doption v-if="followedFailed" @click="loadFollowed">{{ $t('menubar.load_failed_and_retry') }}</a-doption>
              <a-doption v-else-if="followed.length === 0" disabled>{{ $t('menubar.no_followed_projects') }}</a-doption>
              <a-doption
                v-for="project in followed"
                :key="project.id"
                @click="router.push({ name: 'project-detail', params: { slug: project.slug } })"
              >
                {{ project.name }}
              </a-doption>
              <a-divider class="shell__dropdown-divider" />
              <a-doption @click="router.push({ name: 'projects' })">{{ $t('menubar.all_projects') }}</a-doption>
            </template>
          </a-dropdown>

          <a-dropdown trigger="hover">
            <span class="shell__nav-item">{{ currentLanguageLabel }} <icon-down /></span>
            <template #content>
              <a-dgroup v-if="primaryLanguage" :title="$t('menubar.primary_language')">
                <a-doption @click="chooseLanguage(primaryLanguage)">
                  {{ languageName(primaryLanguage) }}
                </a-doption>
              </a-dgroup>
              <a-dgroup v-if="secondaryLanguages.length > 0" :title="$t('menubar.secondary_language')">
                <a-doption
                  v-for="code in secondaryLanguages"
                  :key="code"
                  @click="chooseLanguage(code)"
                >
                  {{ languageName(code) }}
                </a-doption>
              </a-dgroup>
              <a-dgroup v-if="otherLanguages.length > 0" :title="$t('menubar.additional_languages')">
                <a-doption v-for="lang in otherLanguages" :key="lang.code" @click="chooseLanguage(lang.code)">
                  {{ lang.name }}
                </a-doption>
              </a-dgroup>
              <a-doption v-if="languagesFailed" @click="loadLanguages">{{ $t('menubar.load_failed_and_retry') }}</a-doption>
              <a-doption v-else-if="languages.length === 0 && !primaryLanguage" disabled>
                {{ $t('menubar.loading_language_list') }}
              </a-doption>
            </template>
          </a-dropdown>
        </nav>
      </div>

      <div class="shell__right">
        <router-link v-if="auth.canManage" to="/admin" class="shell__nav-item">{{ $t('menubar.management') }}</router-link>

        <a-tooltip :content="ui.theme === 'dark' ? $t('menubar.switch_light_theme') : $t('menubar.switch_dark_theme')">
          <a-button type="text" shape="circle" :aria-label="$t('menubar.switch_theme')" @click="ui.toggleTheme()">
            <template #icon>
              <icon-sun v-if="ui.theme === 'dark'" />
              <icon-moon v-else />
            </template>
          </a-button>
        </a-tooltip>

        <a-dropdown trigger="hover">
          <span class="shell__nav-item">
            <icon-language /> {{ localeStore.current.label }} <icon-down />
          </span>
          <template #content>
            <a-doption
              v-for="item in localeStore.locales"
              :key="item.code"
              :disabled="item.code === localeStore.locale"
              @click="localeStore.setLocale(item.code)"
            >
              {{ item.label }}
            </a-doption>
          </template>
        </a-dropdown>

        <a-dropdown trigger="hover">
          <span class="shell__nav-item"><icon-plus /> {{ $t('menubar.add') }}</span>
          <template #content>
            <a-doption @click="router.push({ name: 'project-new' })">{{ $t('menubar.add_project') }}</a-doption>
            <a-doption @click="router.push({ name: 'component-new' })">{{ $t('menubar.add_component') }}</a-doption>
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
              {{ $t('menubar.user_home') }}
            </a-doption>
            <a-doption @click="router.push({ name: 'settings' })">{{ $t('menubar.settings') }}</a-doption>
            <a-doption @click="logout">{{ $t('menubar.sign_out') }}</a-doption>
          </template>
        </a-dropdown>

        <a-dropdown trigger="hover">
          <span class="shell__nav-item"><icon-more /> {{ $t('menubar.more') }}</span>
          <template #content>
            <a-doption v-if="links.contact" @click="openLink(links.contact)">{{ $t('menubar.contact_admin') }}</a-doption>
            <a-doption v-if="links.docs" @click="openLink(links.docs)">{{ $t('menubar.docs') }}</a-doption>
            <a-doption v-if="links.contribute" @click="openLink(links.contribute)">{{ $t('menubar.contribute') }}</a-doption>
            <a-doption v-if="links.support" @click="openLink(links.support)">{{ $t('menubar.support') }}</a-doption>
            <a-doption @click="router.push({ name: 'about' })">{{ $t('menubar.about') }}</a-doption>
          </template>
        </a-dropdown>
      </div>
    </a-layout-header>

    <a-layout-content class="shell__content">
      <!-- 以完整路径为键强制整页重挂载，避免同组件在不同路由参数间复用时展示旧数据 -->
      <router-view :key="route.fullPath" />
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

  // 下拉内的分割线紧凑化，避免默认间距把短菜单撑得过高
  &__dropdown-divider {
    margin: 4px 0;
  }

  &__content {
    padding: 24px;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
}
</style>
