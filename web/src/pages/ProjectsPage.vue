<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { siteProjects, type ProjectSort } from '../api/project'
import type { ProjectSummary } from '../api/types'
import { formatDate } from '../format'
import { useLocaleStore } from '@/i18n'

const { t } = useI18n()

const router = useRouter()
const localeStore = useLocaleStore()

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
    loadError.value = error instanceof Error ? error.message : t('projects.load_failed')
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
  router.push({ name: 'project-detail', params: { slug: project.slug } })
}
</script>

<template>
  <div class="projects">
    <div class="projects__header">
      <a-typography-title :heading="5">{{ $t('projects.title') }}</a-typography-title>
      <a-radio-group
        :model-value="sort"
        type="button"
        @change="changeSort($event as ProjectSort)"
      >
        <a-radio value="name">{{ $t('projects.sort_by_name') }}</a-radio>
        <a-radio value="creator">{{ $t('projects.sort_by_creator') }}</a-radio>
        <a-radio value="activity">{{ $t('projects.sort_by_activity') }}</a-radio>
      </a-radio-group>
    </div>

    <a-spin :loading="loading" class="projects__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">{{ $t('common.retry') }}</a-button>
        </template>
      </a-result>
      <a-empty v-else-if="projects.length === 0" :description="$t('projects.empty')" />
      <a-list v-else :bordered="true">
        <a-list-item v-for="project in projects" :key="project.id">
          <div class="projects__row" @click="openProject(project)">
            <div class="projects__main">
              <span class="projects__name">{{ project.name }}</span>
              <a-tag size="small" class="projects__namespace">{{ project.namespace }}</a-tag>
              <span class="projects__description">{{ project.description }}</span>
            </div>
            <div class="projects__meta">
              <span>{{ $t('projects.created_by', { name: project.createdBy }) }}</span>
              <span>{{ project.lastContributionAt ? $t('projects.last_contribution', { date: formatDate(project.lastContributionAt, localeStore.current.bcp47) }) : $t('projects.no_contribution') }}</span>
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
