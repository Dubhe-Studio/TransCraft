<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { redirectTarget } from '../router/redirect'
import { useAuthStore } from '../stores/auth'
import AuthLocaleMenu from '../components/AuthLocaleMenu.vue'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

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
    <AuthLocaleMenu />

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
</style>
