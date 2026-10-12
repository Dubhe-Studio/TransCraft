<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { register, registerConfig, sendEmailCode } from '../api/auth'
import { redirectTarget } from '../router/redirect'
import { useAuthStore } from '../stores/auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_RESEND_SECONDS = 60

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
    Message.error('获取注册配置失败，邀请码要求以提交时服务端校验为准')
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
    Message.warning('请输入正确的邮箱地址')
    return
  }
  if (sendingCode.value || countdown.value > 0) {
    return
  }
  sendingCode.value = true
  try {
    await sendEmailCode(form.email)
    Message.success('验证码已发送，请查收邮件')
    startCountdown()
  } catch (error) {
    console.error('发送邮箱验证码失败:', error)
    Message.error(error instanceof Error ? error.message : '验证码发送失败，请稍后重试')
  } finally {
    sendingCode.value = false
  }
}

function validate(): string {
  if (!form.username || !form.email || !form.password || !form.emailCode) {
    return '请完整填写用户名、邮箱、密码和邮箱验证码'
  }
  if (!EMAIL_PATTERN.test(form.email)) {
    return '邮箱格式不正确'
  }
  if (form.password !== form.confirmPassword) {
    return '两次输入的密码不一致'
  }
  if (inviteRequired.value && !form.inviteCode) {
    return '当前站点启用了邀请码注册，请填写邀请码'
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
    Message.error(error instanceof Error ? error.message : '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <a-card class="auth-card" :bordered="false">
      <div class="auth-card__brand">
        <img src="/favicon.svg" alt="TransCraft" class="auth-card__logo" />
        <span class="auth-card__name">TransCraft</span>
      </div>
      <a-typography-title :heading="5" class="auth-card__title">注册账号</a-typography-title>

      <a-form :model="form" layout="vertical" @submit-success="submit">
        <a-form-item field="username" label="用户名" hide-asterisk>
          <a-input v-model="form.username" placeholder="用户名" allow-clear />
        </a-form-item>
        <a-form-item field="email" label="邮箱" hide-asterisk>
          <a-input v-model="form.email" placeholder="邮箱" allow-clear />
        </a-form-item>
        <a-form-item field="emailCode" label="邮箱验证码" hide-asterisk>
          <div class="auth-code-row">
            <a-input v-model="form.emailCode" placeholder="验证码" allow-clear />
            <a-button :loading="sendingCode" :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `重新发送（${countdown}s）` : '发送验证码' }}
            </a-button>
          </div>
        </a-form-item>
        <a-form-item field="password" label="密码" hide-asterisk>
          <a-input-password v-model="form.password" placeholder="密码" />
        </a-form-item>
        <a-form-item field="confirmPassword" label="确认密码" hide-asterisk>
          <a-input-password v-model="form.confirmPassword" placeholder="再次输入密码" />
        </a-form-item>
        <a-form-item v-if="inviteRequired" field="inviteCode" label="邀请码" hide-asterisk>
          <a-input v-model="form.inviteCode" placeholder="本站已启用邀请码注册" allow-clear />
        </a-form-item>
        <a-button type="primary" long html-type="submit" :loading="loading">注册</a-button>
      </a-form>

      <div class="auth-card__footer">
        已有账号？
        <router-link :to="{ name: 'login', query: route.query }">直接登录</router-link>
      </div>
    </a-card>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/auth.scss';
</style>
