<script setup lang="ts">
// 仪表盘与项目详情共用的翻译进度表：名称列 + 八项统计 + 行内进度条
import type { ProgressRow } from '../api/types'

defineProps<{
  rows: ProgressRow[]
  // 名称列的表头文案，如"项目"或"部件"
  nameLabel: string
}>()

const emit = defineEmits<{
  rowClick: [row: ProgressRow]
}>()

function formatNumber(value: number): string {
  return value.toLocaleString()
}
</script>

<template>
  <div class="progress-table">
    <div class="progress-table__row progress-table__row--head">
      <span class="progress-table__cell progress-table__cell--name">{{ nameLabel }}</span>
      <span class="progress-table__cell">已翻译</span>
      <span class="progress-table__cell">未完成</span>
      <span class="progress-table__cell">未完成的词</span>
      <span class="progress-table__cell">未完成的字符数</span>
      <span class="progress-table__cell">未翻译</span>
      <span class="progress-table__cell">检查</span>
      <span class="progress-table__cell">建议</span>
      <span class="progress-table__cell">评论</span>
    </div>

    <div
      v-for="row in rows"
      :key="row.id"
      class="progress-table__item"
      @click="emit('rowClick', row)"
    >
      <div class="progress-table__row">
        <span class="progress-table__cell progress-table__cell--name">
          <slot name="name" :row="row">
            <icon-folder class="progress-table__icon" />
            {{ row.name }}
          </slot>
        </span>
        <span class="progress-table__cell progress-table__cell--percent">
          <icon-check-circle-fill v-if="row.translatedPercent >= 100" class="progress-table__done" />
          <template v-else>{{ row.translatedPercent }}%</template>
        </span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.incompleteStrings) }}</span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.incompleteWords) }}</span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.incompleteChars) }}</span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.untranslatedStrings) }}</span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.failingChecks) }}</span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.suggestions) }}</span>
        <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(row.comments) }}</span>
      </div>
      <a-progress
        :percent="row.translatedPercent / 100"
        :show-text="false"
        color="rgb(var(--primary-6))"
        track-color="var(--color-fill-2)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.progress-table {
  width: 100%;

  &__row {
    display: grid;
    // 名称列占宽自适应，其余统计列等宽
    grid-template-columns: minmax(220px, 2fr) repeat(8, minmax(90px, 1fr));
    gap: 0 16px;
    align-items: center;
    padding: 8px 0;

    &--head {
      color: var(--color-text-2);
      font-size: 13px;
      border-bottom: 1px solid var(--color-border);
    }
  }

  &__item {
    cursor: pointer;
    padding: 4px 0;

    &:hover {
      background-color: var(--color-fill-1);
    }
  }

  &__cell {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--name {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--color-text-1);
    }

    &--number {
      color: var(--color-text-1);
    }

    &--percent {
      color: rgb(var(--success-6));
    }
  }

  &__icon {
    color: rgb(var(--primary-6));
    flex-shrink: 0;
  }

  &__done {
    color: rgb(var(--success-6));
    font-size: 18px;
  }
}
</style>
