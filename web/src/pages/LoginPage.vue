<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { redirectTarget } from '../router/redirect'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ account: '', password: '' })
const loading = ref(false)

async function submit() {
  if (!form.account || !form.password) {
    Message.warning('请输入账号和密码')
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
    Message.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
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
      <a-typography-title :heading="5" class="auth-card__title">登录账号</a-typography-title>

      <a-form :model="form" layout="vertical" @submit-success="submit">
        <a-form-item field="account" label="账号" hide-asterisk>
          <a-input v-model="form.account" placeholder="用户名或邮箱" allow-clear />
        </a-form-item>
        <a-form-item field="password" label="密码" hide-asterisk>
          <a-input-password v-model="form.password" placeholder="密码" />
        </a-form-item>
        <a-button type="primary" long html-type="submit" :loading="loading">登录</a-button>
      </a-form>

      <div class="auth-card__footer">
        还没有账号？
        <router-link :to="{ name: 'register', query: route.query }">立即注册</router-link>
      </div>
    </a-card>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/auth.scss';
</style>
