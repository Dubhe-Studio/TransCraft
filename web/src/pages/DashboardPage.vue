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
// 语言快速切换时旧请求不得覆盖新数据
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    const list = await followedProgress(ui.currentLanguage)
    if (seq !== loadSeq) return
    projects.value = list
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载关注的项目失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    if (seq === loadSeq) {
      loading.value = false
    }
  }
}

// 进度统计跟随当前工作语言变化
watch(() => ui.currentLanguage, load)

onMounted(load)

// 表格插槽只暴露 ProgressRow，地址标识从完整行数据里按 id 取回
function openProject(row: ProgressRow) {
  const project = projects.value.find((p) => p.id === row.id)
  if (!project) return
  router.push({ name: 'project-detail', params: { slug: project.slug } })
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard__header">
      <a-typography-title :heading="5" style="margin: 0">{{ $t('dashboard.followed_projects') }}</a-typography-title>
      <a-button type="primary" @click="router.push({ name: 'project-new' })">
        <template #icon><icon-plus /></template>
        {{ $t('common.add_project') }}
      </a-button>
    </div>

    <a-spin :loading="loading" class="dashboard__body">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">{{ $t('dashboard.retry') }}</a-button>
        </template>
      </a-result>

      <a-empty v-else-if="projects.length === 0" :description="$t('common.no_followed_projects')" />

      <ProgressTable
        v-else
        :rows="projects"
        :name-label="$t('common.project')"
        @row-click="openProject"
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
