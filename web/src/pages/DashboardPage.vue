<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { followedProjects } from '../api/project'
import type { ProjectSummary } from '../api/types'

const router = useRouter()

const projects = ref<ProjectSummary[]>([])
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    projects.value = await followedProjects()
  } catch (error) {
    console.error('加载关注的项目失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

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

      <div v-else class="dashboard__grid">
        <a-card
          v-for="project in projects"
          :key="project.id"
          class="dashboard__card"
          hoverable
          @click="router.push({ name: 'project-detail', params: { id: project.id } })"
        >
          <a-card-meta :title="project.name" :description="project.description || project.namespace" />
        </a-card>
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  &__card {
    cursor: pointer;
  }
}
</style>
