<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { createPart } from '../api/part'
import { followedProjects, projectDetail } from '../api/project'
import type { PartInput, ProjectDetail, ProjectSummary } from '../api/types'

const router = useRouter()
const route = useRoute()

const projects = ref<ProjectSummary[]>([])
// 同步开关打开时输入留空，展示所选项目的当前配置作为同步来源
const selectedProject = ref<ProjectDetail | null>(null)

const form = reactive<PartInput>({
  projectId: 0,
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

watch(
  () => form.projectId,
  async (projectId) => {
    if (!projectId) {
      selectedProject.value = null
      return
    }
    try {
      selectedProject.value = await projectDetail(projectId)
    } catch (error) {
      console.error('加载项目配置失败:', error)
      Message.error('加载项目配置失败，请刷新重试')
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
    Message.error('加载项目列表失败，请刷新重试')
  }
})

async function submit() {
  submitting.value = true
  try {
    await createPart({
      ...form,
      name: form.name.trim(),
      namespace: form.namespace.trim(),
      repoUrl: form.repoUrl.trim(),
      branch: form.branch.trim() || 'main',
      forkOwner: form.forkOwner.trim(),
      forkBranch: form.forkBranch.trim(),
      fileMask: fileMaskSync.value ? '' : form.fileMask.trim(),
      templatePath: templatePathSync.value ? '' : form.templatePath.trim(),
    })
    Message.success('部件创建成功')
    router.push({ name: 'project-detail', params: { id: form.projectId } })
  } catch (error) {
    console.error('创建部件失败:', error)
    Message.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="component-new">
    <a-typography-title :heading="5">添加部件</a-typography-title>

    <a-form :model="form" layout="vertical" class="component-new__form" @submit-success="submit">
      <a-typography-title :heading="6" class="component-new__group-title">基本信息</a-typography-title>
      <a-form-item
        field="projectId"
        label="所属项目"
        required
        :rules="[
          { required: true, message: '请选择所属项目' },
          // projectId 初值为 0，required 对数字 0 视为已填，需另行拦截未选择的情形
          { validator: (value, fail) => { if (!value) fail('请选择所属项目') } },
        ]"
      >
        <a-select
          v-model="form.projectId"
          placeholder="选择项目"
          :options="projects.map((p) => ({ label: p.name, value: p.id }))"
        />
      </a-form-item>
      <a-form-item field="name" label="部件名称" required :rules="[{ required: true, message: '部件名称不能为空' }]">
        <a-input v-model="form.name" placeholder="例如 Create 本体" allow-clear />
      </a-form-item>
      <a-form-item field="namespace" label="命名空间" required :rules="[{ required: true, message: '命名空间不能为空' }]">
        <a-input v-model="form.namespace" placeholder="例如 create" allow-clear />
      </a-form-item>

      <a-typography-title :heading="6" class="component-new__group-title">VCS</a-typography-title>
      <a-form-item field="repoUrl" label="仓库地址" required :rules="[{ required: true, message: '仓库地址不能为空' }]">
        <a-input v-model="form.repoUrl" placeholder="https://github.com/owner/repo" allow-clear />
      </a-form-item>
      <a-form-item field="branch" label="分支">
        <a-input v-model="form.branch" placeholder="main" allow-clear />
      </a-form-item>
      <a-form-item field="forkOwner" label="Fork 所有者" extra="留空表示直接向原仓库提交翻译">
        <a-input v-model="form.forkOwner" allow-clear />
      </a-form-item>
      <a-form-item field="forkBranch" label="Fork 分支">
        <a-input v-model="form.forkBranch" allow-clear />
      </a-form-item>

      <a-typography-title :heading="6" class="component-new__group-title">文件</a-typography-title>
      <a-form-item field="fileMask" label="语言文件掩码" extra="从项目同步时使用项目的当前配置">
        <a-radio-group v-model="fileMaskSync" type="button" size="small">
          <a-radio :value="true">从项目同步</a-radio>
          <a-radio :value="false">部件自定义</a-radio>
        </a-radio-group>
        <a-input
          v-if="!fileMaskSync"
          v-model="form.fileMask"
          class="component-new__sync-input"
          placeholder="src/main/resources/assets/*/lang/*.json"
          allow-clear
        />
        <a-typography-text v-else type="secondary" class="component-new__sync-value">
          {{ syncFileMask || '项目尚未配置' }}
        </a-typography-text>
      </a-form-item>
      <a-form-item field="templatePath" label="翻译模板文件" extra="生成新语言文件时使用的模板路径">
        <a-radio-group v-model="templatePathSync" type="button" size="small">
          <a-radio :value="true">从项目同步</a-radio>
          <a-radio :value="false">部件自定义</a-radio>
        </a-radio-group>
        <a-input
          v-if="!templatePathSync"
          v-model="form.templatePath"
          class="component-new__sync-input"
          placeholder="src/main/resources/assets/create/lang/en_us.json"
          allow-clear
        />
        <a-typography-text v-else type="secondary" class="component-new__sync-value">
          {{ syncTemplatePath || '项目尚未配置' }}
        </a-typography-text>
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="submitting">创建部件</a-button>
          <a-button @click="router.push({ name: 'dashboard' })">取消</a-button>
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
