<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { createPart } from '../api/part'
import { followedProjects, projectDetail } from '../api/project'
import { validSlug } from '../slug'
import type { PartInput, ProjectDetail, ProjectSummary } from '../api/types'

const { t } = useI18n()

const router = useRouter()
const route = useRoute()

const projects = ref<ProjectSummary[]>([])
// 同步开关打开时输入留空，展示所选项目的当前配置作为同步来源
const selectedProject = ref<ProjectDetail | null>(null)

const form = reactive<PartInput>({
  projectId: 0,
  slug: '',
  name: '',
  namespace: '',
  repoUrl: '',
  branch: 'main',
  forkOwner: '',
  forkBranch: '',
  fileMask: '',
  templatePath: '',
})
const fileMaskSync = ref(true)
const templatePathSync = ref(true)

const submitting = ref(false)

const syncFileMask = computed(() => selectedProject.value?.fileMask ?? '')
const syncTemplatePath = computed(() => selectedProject.value?.templatePath ?? '')

// 连续切换所属项目时后到响应不得覆盖先选项目的配置
let projectSeq = 0

watch(
  () => form.projectId,
  async (projectId) => {
    const seq = ++projectSeq
    if (!projectId) {
      selectedProject.value = null
      return
    }
    try {
      const detail = await projectDetail(projectId)
      if (seq !== projectSeq) return
      selectedProject.value = detail
    } catch (error) {
      if (seq !== projectSeq) return
      selectedProject.value = null
      console.error('加载项目配置失败:', error)
      Message.error(t('part_new.load_project_config_failed'))
    }
  },
)

onMounted(async () => {
  try {
    projects.value = await followedProjects()
    // 从项目详情页进入时带上目标项目，避免重复选择
    const queryProject = Number(route.query.project)
    if (queryProject && projects.value.some((p) => p.id === queryProject)) {
      form.projectId = queryProject
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
    Message.error(t('part_new.load_project_list_failed'))
  }
})

async function submit() {
  const slug = form.slug.trim()
  if (!validSlug(slug)) {
    Message.error(t('slug.invalid'))
    return
  }
  // 跳转部件页需要项目 slug，所属项目详情未就绪时不允许提交
  const project = selectedProject.value
  if (!project) {
    Message.error(t('part_new.project_config_not_ready'))
    return
  }
  submitting.value = true
  try {
    await createPart({
      ...form,
      slug,
      name: form.name.trim(),
      namespace: form.namespace.trim(),
      repoUrl: form.repoUrl.trim(),
      branch: form.branch.trim() || 'main',
      forkOwner: form.forkOwner.trim(),
      forkBranch: form.forkBranch.trim(),
      fileMask: fileMaskSync.value ? '' : form.fileMask.trim(),
      templatePath: templatePathSync.value ? '' : form.templatePath.trim(),
    })
    Message.success(t('part_new.created'))
    router.push({
      name: 'part-detail',
      params: { slug: project.slug, partSlug: slug },
    })
  } catch (error) {
    console.error('创建部件失败:', error)
    Message.error(error instanceof Error ? error.message : t('part_new.create_failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="component-new">
    <a-typography-title :heading="5">{{ $t('part_new.title') }}</a-typography-title>

    <a-form :model="form" layout="vertical" class="component-new__form" @submit-success="submit">
      <a-typography-title :heading="6" class="component-new__group-title">{{ $t('part_new.basic') }}</a-typography-title>
      <a-form-item
        field="projectId"
        :label="$t('part_new.project')"
        required
        :rules="[
          { required: true, message: $t('part_new.project_required') },
          // projectId 初值为 0，required 对数字 0 视为已填，需另行拦截未选择的情形
          { validator: (value, fail) => { if (!value) fail($t('part_new.project_required')) } },
        ]"
      >
        <a-select
          v-model="form.projectId"
          :placeholder="$t('part_new.project_placeholder')"
          :options="projects.map((p) => ({ label: p.name, value: p.id }))"
        />
      </a-form-item>
      <a-form-item field="name" :label="$t('part.name')" required :rules="[{ required: true, message: $t('part.name_required') }]">
        <a-input v-model="form.name" :placeholder="$t('part_new.name_placeholder')" allow-clear />
      </a-form-item>
      <a-form-item field="slug" :label="$t('slug.label')" required :extra="$t('slug.hint')">
        <a-input v-model="form.slug" :placeholder="$t('part_new.slug_placeholder')" allow-clear />
      </a-form-item>
      <a-form-item field="namespace" :label="$t('part.namespace')" required :rules="[{ required: true, message: $t('part.namespace_required') }]">
        <a-input v-model="form.namespace" :placeholder="$t('part_new.namespace_placeholder')" allow-clear />
      </a-form-item>

      <a-typography-title :heading="6" class="component-new__group-title">VCS</a-typography-title>
      <a-form-item field="repoUrl" :label="$t('part.repo_url')" required :rules="[{ required: true, message: $t('part.repo_url_required') }]">
        <a-input v-model="form.repoUrl" placeholder="https://github.com/owner/repo" allow-clear />
      </a-form-item>
      <a-form-item field="branch" :label="$t('part.branch')">
        <a-input v-model="form.branch" placeholder="main" allow-clear />
      </a-form-item>
      <a-form-item field="forkOwner" :label="$t('part.fork_owner')" :extra="$t('part.fork_owner_hint')">
        <a-input v-model="form.forkOwner" allow-clear />
      </a-form-item>
      <a-form-item field="forkBranch" :label="$t('part.fork_branch')">
        <a-input v-model="form.forkBranch" allow-clear />
      </a-form-item>

      <a-typography-title :heading="6" class="component-new__group-title">{{ $t('part.files') }}</a-typography-title>
      <a-form-item field="fileMask" :label="$t('part.file_mask')" :extra="$t('part_new.file_mask_hint')">
        <a-radio-group v-model="fileMaskSync" type="button" size="small">
          <a-radio :value="true">{{ $t('part.sync_from_project') }}</a-radio>
          <a-radio :value="false">{{ $t('part.custom') }}</a-radio>
        </a-radio-group>
        <a-input
          v-if="!fileMaskSync"
          v-model="form.fileMask"
          class="component-new__sync-input"
          placeholder="src/main/resources/assets/*/lang/*.json"
          allow-clear
        />
        <a-typography-text v-else type="secondary" class="component-new__sync-value">
          {{ syncFileMask || $t('part.not_configured') }}
        </a-typography-text>
      </a-form-item>
      <a-form-item field="templatePath" :label="$t('part.template_path')" :extra="$t('part_new.template_path_hint')">
        <a-radio-group v-model="templatePathSync" type="button" size="small">
          <a-radio :value="true">{{ $t('part.sync_from_project') }}</a-radio>
          <a-radio :value="false">{{ $t('part.custom') }}</a-radio>
        </a-radio-group>
        <a-input
          v-if="!templatePathSync"
          v-model="form.templatePath"
          class="component-new__sync-input"
          placeholder="src/main/resources/assets/create/lang/en_us.json"
          allow-clear
        />
        <a-typography-text v-else type="secondary" class="component-new__sync-value">
          {{ syncTemplatePath || $t('part.not_configured') }}
        </a-typography-text>
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="submitting">{{ $t('part_new.create') }}</a-button>
          <a-button @click="router.push({ name: 'dashboard' })">{{ $t('common.cancel') }}</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped lang="scss">
.component-new {
  max-width: 640px;

  &__group-title {
    margin: 8px 0 12px;
  }

  &__sync-input {
    margin-top: 8px;
  }

  &__sync-value {
    display: block;
    margin-top: 8px;
    word-break: break-all;
  }
}
</style>
