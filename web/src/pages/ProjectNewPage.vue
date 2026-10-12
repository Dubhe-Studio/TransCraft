<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { supportedLanguages } from '../api/language'
import { createProject } from '../api/project'
import type { LanguageInfo, ProjectInput } from '../api/types'

const router = useRouter()

const languageList = ref<LanguageInfo[]>([])

const form = reactive<ProjectInput>({
  name: '',
  namespace: '',
  description: '',
  repoUrl: '',
  branch: 'main',
  forkOwner: '',
  forkBranch: '',
  fileMask: '',
  templatePath: '',
  referenceLanguage: 'en_us',
})

const submitting = ref(false)

onMounted(async () => {
  languageList.value = await supportedLanguages()
})

async function submit() {
  submitting.value = true
  try {
    const created = await createProject({ ...form })
    Message.success('项目创建成功')
    router.push({ name: 'project-detail', params: { id: created.id } })
  } catch (error) {
    console.error('创建项目失败:', error)
    Message.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="project-new">
    <a-typography-title :heading="5">添加项目</a-typography-title>

    <a-form :model="form" layout="vertical" class="project-new__form" @submit-success="submit">
      <a-form-item field="name" label="项目名称" required :rules="[{ required: true, message: '项目名称不能为空' }]">
        <a-input v-model="form.name" placeholder="例如 Create" allow-clear />
      </a-form-item>
      <a-form-item field="namespace" label="命名空间" required :rules="[{ required: true, message: '命名空间不能为空' }]">
        <a-input v-model="form.namespace" placeholder="例如 create" allow-clear />
      </a-form-item>
      <a-form-item field="description" label="项目简介">
        <a-textarea v-model="form.description" placeholder="一句话介绍这个项目" :auto-size="{ minRows: 2 }" allow-clear />
      </a-form-item>
      <a-form-item field="repoUrl" label="仓库地址" required :rules="[{ required: true, message: '仓库地址不能为空' }]">
        <a-input v-model="form.repoUrl" placeholder="https://github.com/owner/repo" allow-clear />
      </a-form-item>
      <a-form-item field="branch" label="分支">
        <a-input v-model="form.branch" placeholder="main" allow-clear />
      </a-form-item>
      <a-form-item field="forkOwner" label="Fork 所有者（可选）" extra="留空表示直接向原仓库提交翻译">
        <a-input v-model="form.forkOwner" placeholder="你的 GitHub 用户名" allow-clear />
      </a-form-item>
      <a-form-item field="forkBranch" label="Fork 分支（可选）">
        <a-input v-model="form.forkBranch" placeholder="留空表示与主分支同名" allow-clear />
      </a-form-item>
      <a-form-item field="fileMask" label="语言文件掩码" extra="相对仓库根目录的路径，例如 src/main/resources/assets/create/lang/*.json">
        <a-input v-model="form.fileMask" placeholder="src/main/resources/assets/*/lang/*.json" allow-clear />
      </a-form-item>
      <a-form-item field="templatePath" label="翻译模板文件" extra="生成新语言文件时使用的模板路径">
        <a-input v-model="form.templatePath" placeholder="src/main/resources/assets/create/lang/en_us.json" allow-clear />
      </a-form-item>
      <a-form-item field="referenceLanguage" label="参考语言">
        <a-select v-model="form.referenceLanguage" :options="languageList.map((l) => ({ label: l.name, value: l.code }))" />
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="submitting">创建项目</a-button>
          <a-button @click="router.back()">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped lang="scss">
.project-new {
  max-width: 640px;
}
</style>
