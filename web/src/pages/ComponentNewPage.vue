<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { createPart } from '../api/part'
import { followedProjects } from '../api/project'
import type { PartInput, ProjectSummary } from '../api/types'

const router = useRouter()

const projects = ref<ProjectSummary[]>([])

const form = reactive<PartInput>({
  projectId: 0,
  name: '',
  namespace: '',
  fileMask: '',
  templatePath: '',
})

const submitting = ref(false)

onMounted(async () => {
  try {
    projects.value = await followedProjects()
  } catch (error) {
    console.error('加载项目列表失败:', error)
    Message.error('加载项目列表失败，请刷新重试')
  }
})

async function submit() {
  submitting.value = true
  try {
    await createPart({ ...form })
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
      <a-form-item field="fileMask" label="语言文件掩码" extra="相对仓库根目录的路径，例如 src/main/resources/assets/create/lang/*.json">
        <a-input v-model="form.fileMask" placeholder="src/main/resources/assets/*/lang/*.json" allow-clear />
      </a-form-item>
      <a-form-item field="templatePath" label="翻译模板文件" extra="生成新语言文件时使用的模板路径">
        <a-input v-model="form.templatePath" placeholder="src/main/resources/assets/create/lang/en_us.json" allow-clear />
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
}
</style>
