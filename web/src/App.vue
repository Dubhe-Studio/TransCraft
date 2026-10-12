<script setup lang="ts">
import { ref } from 'vue'
import { Message } from '@arco-design/web-vue'

const stack = [
  { label: 'Vite + Vue 3 + TypeScript', value: '前端构建与框架' },
  { label: 'Arco Design', value: '组件库与图标' },
  { label: 'Sass', value: '样式预处理' },
  { label: 'Golang + Hertz', value: '后端 HTTP 服务' },
  { label: 'MySQL / PostgreSQL', value: '关系数据库' },
  { label: 'Redis', value: '缓存' },
]

const checking = ref(false)

async function checkHealth() {
  checking.value = true
  try {
    const resp = await fetch('/api/health')
    const body = (await resp.json()) as { database: string; redis: string }
    if (resp.ok) {
      Message.success(`后端正常 — 数据库: ${body.database}，Redis: ${body.redis}`)
    } else {
      Message.error(`依赖异常 — 数据库: ${body.database}，Redis: ${body.redis}`)
    }
  } catch (error) {
    console.error('健康检查请求失败:', error)
    Message.error('无法连接后端服务，请确认 Hertz 服务已启动')
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <a-layout class="page">
    <a-layout-header class="page__header">
      <icon-thunderbird class="page__logo-icon" />
      <span class="page__title">TransCraft</span>
    </a-layout-header>

    <a-layout-content class="page__content">
      <a-card class="page__card" :bordered="false">
        <a-typography-title :heading="4">项目初始化完成</a-typography-title>
        <a-typography-paragraph type="secondary">
          前后端技术栈一览：
        </a-typography-paragraph>
        <a-descriptions :data="stack" :column="2" bordered />

        <div class="page__actions">
          <a-button type="primary" :loading="checking" @click="checkHealth">
            <template #icon><icon-sync /></template>
            检查后端状态
          </a-button>
        </div>
      </a-card>
    </a-layout-content>

    <a-layout-footer class="page__footer">
      Vite · Vue · Arco Design · Sass · TypeScript / Golang · Hertz · MySQL · PostgreSQL · Redis
    </a-layout-footer>
  </a-layout>
</template>

<style scoped lang="scss">
.page {
  min-height: 100%;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 24px;
    background-color: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border-2);
  }

  &__logo-icon {
    font-size: 22px;
    color: rgb(var(--primary-6));
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
  }

  &__content {
    display: flex;
    justify-content: center;
    padding: 48px 24px;
  }

  &__card {
    width: 100%;
    max-width: 760px;
  }

  &__actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
  }

  &__footer {
    text-align: center;
    color: var(--color-text-3);
    font-size: 12px;
    padding: 16px;
  }
}
</style>
