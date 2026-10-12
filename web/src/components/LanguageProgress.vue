<script setup lang="ts">
// 项目与部件页共用的各语言完成情况列表：语言名 + 进度条 + 未完成条数
import type { LanguageProgress } from '../api/types'

defineProps<{
  rows: LanguageProgress[]
}>()

function formatNumber(value: number): string {
  return value.toLocaleString()
}
</script>

<template>
  <div class="language-progress">
    <a-empty v-if="rows.length === 0" description="暂无语言进度数据" />
    <div v-for="row in rows" :key="row.code" class="language-progress__row">
      <div class="language-progress__head">
        <span class="language-progress__name">{{ row.name }}</span>
        <a-typography-text type="secondary" class="language-progress__code" code>{{ row.code }}</a-typography-text>
        <span class="language-progress__percent">{{ row.translatedPercent }}%</span>
      </div>
      <a-progress
        :percent="row.translatedPercent / 100"
        :show-text="false"
        color="rgb(var(--primary-6))"
        track-color="var(--color-fill-2)"
      />
      <div class="language-progress__meta">
        未完成 {{ formatNumber(row.untranslatedStrings) }} / 共 {{ formatNumber(row.totalStrings) }} 条
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.language-progress {
  &__row {
    padding: 6px 0;
  }

  &__head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__name {
    color: var(--color-text-1);
  }

  &__percent {
    margin-left: auto;
    color: rgb(var(--success-6));
  }

  &__meta {
    color: var(--color-text-3);
    font-size: 12px;
  }
}
</style>
