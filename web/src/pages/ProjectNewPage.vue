<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { supportedLanguages } from '../api/language'
import { createProject } from '../api/project'
import { validSlug } from '../slug'
import type { LanguageInfo, ProjectInput } from '../api/types'

const { t } = useI18n()

const router = useRouter()

const languageList = ref<LanguageInfo[]>([])

const form = reactive<ProjectInput>({
  name: '',
  slug: '',
  namespace: '',
  description: '',
  fileMask: '',
  templatePath: '',
  referenceLanguage: 'en_us',
})

const submitting = ref(false)

onMounted(async () => {
  try {
    languageList.value = await supportedLanguages()
  } catch (error) {
    console.error('加载语言列表失败:', error)
    Message.error(t('common.load_languages_failed'))
  }
})

async function submit() {
  const slug = form.slug.trim()
  if (!validSlug(slug)) {
    Message.error(t('slug.invalid'))
    return
  }
  submitting.value = true
  try {
    const created = await createProject({ ...form, slug })
    Message.success(t('project_new.created'))
    router.push({ name: 'project-detail', params: { slug: created.slug } })
  } catch (error) {
    console.error('创建项目失败:', error)
    Message.error(error instanceof Error ? error.message : t('project_new.create_failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="project-new">
    <a-typography-title :heading="5">{{ $t('project_new.title') }}</a-typography-title>

    <a-form :model="form" layout="vertical" class="project-new__form" @submit-success="submit">
      <a-form-item field="name" :label="$t('project.name')" required :rules="[{ required: true, message: $t('project.name_required') }]">
        <a-input v-model="form.name" :placeholder="$t('project_new.name_placeholder')" allow-clear />
      </a-form-item>
      <a-form-item field="slug" :label="$t('slug.label')" required :extra="$t('slug.hint')">
        <a-input v-model="form.slug" :placeholder="$t('project_new.slug_placeholder')" allow-clear />
      </a-form-item>
      <a-form-item field="namespace" :label="$t('project.namespace')" required :rules="[{ required: true, message: $t('project.namespace_required') }]">
        <a-input v-model="form.namespace" :placeholder="$t('project_new.namespace_placeholder')" allow-clear />
      </a-form-item>
      <a-form-item field="description" :label="$t('project.description')">
        <a-textarea v-model="form.description" :placeholder="$t('project_new.description_placeholder')" :auto-size="{ minRows: 2 }" allow-clear />
      </a-form-item>
      <a-form-item field="fileMask" :label="$t('project.file_mask')" :extra="$t('project_new.file_mask_hint')">
        <a-input v-model="form.fileMask" placeholder="src/main/resources/assets/*/lang/*.json" allow-clear />
      </a-form-item>
      <a-form-item field="templatePath" :label="$t('project.template_path')" :extra="$t('project_new.template_path_hint')">
        <a-input v-model="form.templatePath" placeholder="src/main/resources/assets/create/lang/en_us.json" allow-clear />
      </a-form-item>
      <a-form-item field="referenceLanguage" :label="$t('project.reference_language')">
        <a-select v-model="form.referenceLanguage" :options="languageList.map((l) => ({ label: l.name, value: l.code }))" />
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="submitting">{{ $t('project_new.create') }}</a-button>
          <a-button @click="router.push({ name: 'dashboard' })">{{ $t('common.cancel') }}</a-button>
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
