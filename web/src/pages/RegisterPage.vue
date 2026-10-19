<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { register, registerConfig, sendEmailCode } from '../api/auth'
import { redirectTarget } from '../router/redirect'
import { useAuthStore } from '../stores/auth'
import AuthLocaleMenu from '../components/AuthLocaleMenu.vue'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_RESEND_SECONDS = 60

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  emailCode: '',
  inviteCode: '',
})
const inviteRequired = ref(false)
const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  try {
    inviteRequired.value = (await registerConfig()).inviteRequired
  } catch (error) {
    console.error('获取注册配置失败:', error)
    Message.error(t('register.config_failed'))
  }
})

onUnmounted(() => {
  if (countdownTimer !== undefined) {
    clearInterval(countdownTimer)
  }
})

function startCountdown() {
  countdown.value = CODE_RESEND_SECONDS
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer !== undefined) {
      clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }, 1000)
}

async function sendCode() {
  if (!EMAIL_PATTERN.test(form.email)) {
    Message.warning(t('register.email_invalid'))
    return
  }
  if (sendingCode.value || countdown.value > 0) {
    return
  }
  sendingCode.value = true
  try {
    await sendEmailCode(form.email)
    Message.success(t('register.code_sent'))
    startCountdown()
  } catch (error) {
    console.error('发送邮箱验证码失败:', error)
    Message.error(error instanceof Error ? error.message : t('register.code_send_failed'))
  } finally {
    sendingCode.value = false
  }
}

function validate(): string {
  if (!form.username || !form.email || !form.password || !form.emailCode) {
    return t('register.fill_all_fields')
  }
  if (!EMAIL_PATTERN.test(form.email)) {
    return t('register.email_invalid')
  }
  if (form.password !== form.confirmPassword) {
    return t('register.password_mismatch')
  }
  if (inviteRequired.value && !form.inviteCode) {
    return t('register.invite_required')
  }
  return ''
}

async function submit() {
  const problem = validate()
  if (problem) {
    Message.warning(problem)
    return
  }
  if (loading.value) {
    return
  }
  loading.value = true
  try {
    const result = await register({
      username: form.username,
      email: form.email,
      password: form.password,
      emailCode: form.emailCode,
      inviteCode: inviteRequired.value ? form.inviteCode : undefined,
    })
    auth.applyLogin(result)
    await router.replace(redirectTarget(route.query))
  } catch (error) {
    console.error('注册失败:', error)
    Message.error(error instanceof Error ? error.message : t('register.register_failed'))
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
      <a-typography-title :heading="5" class="auth-card__title">{{ $t('register.title') }}</a-typography-title>

      <a-form :model="form" layout="vertical" @submit-success="submit">
        <a-form-item field="username" :label="$t('register.username')" hide-asterisk>
          <a-input v-model="form.username" :placeholder="$t('register.username')" allow-clear />
        </a-form-item>
        <a-form-item field="email" :label="$t('register.email')" hide-asterisk>
          <a-input v-model="form.email" :placeholder="$t('register.email')" allow-clear />
        </a-form-item>
        <a-form-item field="emailCode" :label="$t('register.email_code')" hide-asterisk>
          <div class="auth-code-row">
            <a-input v-model="form.emailCode" :placeholder="$t('register.email_code_placeholder')" allow-clear />
            <a-button :loading="sendingCode" :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? $t('register.resend_code', { seconds: countdown }) : $t('register.send_code') }}
            </a-button>
          </div>
        </a-form-item>
        <a-form-item field="password" :label="$t('register.password')" hide-asterisk>
          <a-input-password v-model="form.password" :placeholder="$t('register.password')" />
        </a-form-item>
        <a-form-item field="confirmPassword" :label="$t('register.confirm_password')" hide-asterisk>
          <a-input-password v-model="form.confirmPassword" :placeholder="$t('register.confirm_password_placeholder')" />
        </a-form-item>
        <a-form-item v-if="inviteRequired" field="inviteCode" :label="$t('register.invite_code')" hide-asterisk>
          <a-input v-model="form.inviteCode" :placeholder="$t('register.invite_code_placeholder')" allow-clear />
        </a-form-item>
        <a-button type="primary" long html-type="submit" :loading="loading">{{ $t('register.submit') }}</a-button>
      </a-form>

      <div class="auth-card__footer">
        {{ $t('register.has_account') }}
        <router-link :to="{ name: 'login', query: route.query }">{{ $t('register.go_login') }}</router-link>
      </div>
    </a-card>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/auth.scss';
</style>
