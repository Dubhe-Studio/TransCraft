<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { siteProjects, type ProjectSort } from '../api/project'
import type { ProjectSummary } from '../api/types'

const router = useRouter()

const projects = ref<ProjectSummary[]>([])
const sort = ref<ProjectSort>('name')
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    projects.value = await siteProjects(sort.value)
  } catch (error) {
    console.error('加载全部项目失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function changeSort(value: ProjectSort) {
  sort.value = value
  load()
}

function openProject(project: ProjectSummary) {
  router.push({ name: 'project-detail', params: { id: project.id } })
}

// 后端时间为 UTC ISO 串，转成浏览器本地日期展示，避免直接截断字符串导致日期偏差
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="projects">
    <div class="projects__header">
      <a-typography-title :heading="5">全部项目</a-typography-title>
      <a-radio-group
        :model-value="sort"
        type="button"
        @change="changeSort($event as ProjectSort)"
      >
        <a-radio value="name">按名称</a-radio>
        <a-radio value="creator">按创建者</a-radio>
        <a-radio value="activity">按最后贡献时间</a-radio>
      </a-radio-group>
    </div>

    <a-spin :loading="loading" class="projects__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
        </template>
      </a-result>
      <a-empty v-else-if="projects.length === 0" description="站点还没有任何项目" />
      <a-list v-else :bordered="true">
        <a-list-item v-for="project in projects" :key="project.id">
          <div class="projects__row" @click="openProject(project)">
            <div class="projects__main">
              <span class="projects__name">{{ project.name }}</span>
              <a-tag size="small" class="projects__namespace">{{ project.namespace }}</a-tag>
              <span class="projects__description">{{ project.description }}</span>
            </div>
            <div class="projects__meta">
              <span>创建者 {{ project.createdBy }}</span>
              <span>{{ project.lastContributionAt ? `最后贡献 ${formatDate(project.lastContributionAt)}` : '暂无贡献' }}</span>
            </div>
          </div>
        </a-list-item>
      </a-list>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.projects {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__spin {
    width: 100%;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    cursor: pointer;
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__name {
    font-weight: 500;
    color: var(--color-text-1);
  }

  &__namespace {
    flex-shrink: 0;
  }

  &__description {
    color: var(--color-text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    gap: 16px;
    flex-shrink: 0;
    color: var(--color-text-3);
    font-size: 13px;
  }
}
</style>
