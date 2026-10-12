<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { followedProgress } from '../api/project'
import type { ProgressRow, ProjectProgress } from '../api/types'
import ProgressTable from '../components/ProgressTable.vue'
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

      <ProgressTable
        v-else
        :rows="projects"
        name-label="项目"
        @row-click="(row: ProgressRow) => router.push({ name: 'project-detail', params: { id: row.id } })"
      />
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
</style>
