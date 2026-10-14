<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { redirectTarget } from '../router/redirect'
import { useAuthStore } from '../stores/auth'
import { useLocaleStore } from '@/i18n'
import { useI18n } from "vue-i18n";

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const localeStore = useLocaleStore()

const form = reactive({ account: '', password: '' })
const loading = ref(false)

async function submit() {
  if (!form.account || !form.password) {
    Message.warning(t('login.enter_account_password'))
    return
  }
  if (loading.value) {
    return
  }
  loading.value = true
  try {
    await auth.login(form.account, form.password)
    await router.replace(redirectTarget(route.query))
  } catch (error) {
    console.error('登录失败:', error)
    Message.error(error instanceof Error ? error.message : t('login.failed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="login-locale">
      <a-dropdown trigger="hover">
        <a-button type="text">
          <template #icon>
            <icon-language />
          </template>
          {{ localeStore.current.label }} <icon-down />
        </a-button>
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
    </div>

    <a-card class="auth-card" :bordered="false">
      <div class="auth-card__brand">
        <img src="/favicon.svg" alt="TransCraft" class="auth-card__logo" />
        <span class="auth-card__name">TransCraft</span>
      </div>
      <a-typography-title :heading="5" class="auth-card__title">{{ $t('login.login') }}</a-typography-title>

      <a-form :model="form" layout="vertical" @submit-success="submit">
        <a-form-item field="account" :label="$t('login.account')" hide-asterisk>
          <a-input v-model="form.account" :placeholder="$t('login.username_or_email')" allow-clear />
        </a-form-item>
        <a-form-item field="password" :label="$t('login.password')" hide-asterisk>
          <a-input-password v-model="form.password" :placeholder="$t('login.password')" />
        </a-form-item>
        <a-button type="primary" long html-type="submit" :loading="loading">{{ $t('login.login') }}</a-button>
      </a-form>

      <div class="auth-card__footer">
        {{ $t('login.no_account') }}
        <router-link :to="{ name: 'register', query: route.query }">{{ $t('login.sign_up') }}</router-link>
      </div>
    </a-card>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/auth.scss';

// 语言入口贴页面右上角，卡片本身仍然居中
.auth-page {
  position: relative;
}

.login-locale {
  position: absolute;
  top: 24px;
  right: 24px;
}
</style>
