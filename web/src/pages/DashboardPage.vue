<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { followedProgress } from '../api/project'
import type { ProjectProgress } from '../api/types'
import { useUiStore } from '../stores/ui'

const router = useRouter()
const ui = useUiStore()

const projects = ref<ProjectProgress[]>([])
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    projects.value = await followedProgress(ui.currentLanguage)
  } catch (error) {
    console.error('加载关注的项目失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

// 进度统计跟随当前工作语言变化
watch(() => ui.currentLanguage, load)

onMounted(load)

function formatNumber(value: number): string {
  return value.toLocaleString()
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard__header">
      <a-typography-title :heading="5" style="margin: 0">关注的项目</a-typography-title>
      <a-button type="primary" @click="router.push({ name: 'project-new' })">
        <template #icon><icon-plus /></template>
        添加项目
      </a-button>
    </div>

    <a-spin :loading="loading" class="dashboard__body">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
        </template>
      </a-result>

      <a-empty v-else-if="projects.length === 0" description="还没有关注的项目" />

      <div v-else class="progress-table">
        <div class="progress-table__row progress-table__row--head">
          <span class="progress-table__cell progress-table__cell--project">项目</span>
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
          v-for="project in projects"
          :key="project.id"
          class="progress-table__item"
          @click="router.push({ name: 'project-detail', params: { id: project.id } })"
        >
          <div class="progress-table__row">
            <span class="progress-table__cell progress-table__cell--project">
              <icon-folder class="progress-table__folder" />
              <a-link @click.stop="router.push({ name: 'project-detail', params: { id: project.id } })">
                {{ project.name }}
              </a-link>
            </span>
            <span class="progress-table__cell progress-table__cell--number">
              <icon-check-circle-fill v-if="project.translatedPercent >= 100" class="progress-table__done" />
              <template v-else>{{ project.translatedPercent }}%</template>
            </span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.incompleteStrings) }}</span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.incompleteWords) }}</span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.incompleteChars) }}</span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.untranslatedStrings) }}</span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.failingChecks) }}</span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.suggestions) }}</span>
            <span class="progress-table__cell progress-table__cell--number">{{ formatNumber(project.comments) }}</span>
          </div>
          <a-progress
            :percent="project.translatedPercent / 100"
            :show-text="false"
            color="rgb(var(--success-6))"
            track-color="var(--color-fill-2)"
          />
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__body {
    width: 100%;
  }
}

.progress-table {
  width: 100%;

  &__row {
    display: grid;
    // 项目名列占宽自适应，其余统计列等宽
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

    &--project {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &--number {
      color: rgb(var(--success-6));
    }
  }

  &__folder {
    color: rgb(var(--success-6));
    flex-shrink: 0;
  }

  &__done {
    color: rgb(var(--success-6));
    font-size: 18px;
  }
}
</style>
