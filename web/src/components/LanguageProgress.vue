<script setup lang="ts">
// 项目与部件页共用的各语言完成情况列表：语言名 + 进度条 + 未完成条数
// link 为真时每行可点击，由父级在 row-click 中决定跳转目标
import { useLocaleStore } from '@/i18n'
import { formatNumber } from '../format'
import type { LanguageProgress } from '../api/types'

defineProps<{
  rows: LanguageProgress[]
  link?: boolean
}>()

const emit = defineEmits<{
  rowClick: [row: LanguageProgress]
}>()

const localeStore = useLocaleStore()
</script>

<template>
  <div class="language-progress">
    <a-empty v-if="rows.length === 0" :description="$t('language_progress.empty')" />
    <div
      v-for="row in rows"
      :key="row.code"
      class="language-progress__row"
      :class="{ 'language-progress__row--link': link }"
      @click="link && emit('rowClick', row)"
    >
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
        {{ $t('language_progress.summary', {
          unfinished: formatNumber(row.untranslatedStrings, localeStore.current.bcp47),
          total: formatNumber(row.totalStrings, localeStore.current.bcp47),
        }) }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.language-progress {
  &__row {
    padding: 6px 0;

    &--link {
      cursor: pointer;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 0 -8px;

      &:hover {
        background: var(--color-fill-2);
      }
    }
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
