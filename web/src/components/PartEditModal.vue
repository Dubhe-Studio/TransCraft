<script setup lang="ts">
// 部件配置编辑弹窗：项目页的部件列表与部件页共用，避免两份表单逻辑漂移
// 打开方式为父级给 part 传入要编辑的部件，保存成功后以 saved 事件回传最新数据
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { updatePart } from '../api/part'
import { validSlug } from '../slug'
import type { Part, PartInput } from '../api/types'

const { t } = useI18n()

const props = defineProps<{
  part: Part | null
  // 文件配置选择“从项目同步”时展示的项目侧当前值
  projectFileMask: string
  projectTemplatePath: string
}>()

const emit = defineEmits<{
  saved: [part: Part]
  // 弹窗关闭（取消或保存成功）后父级清空编辑目标，保证同一部件可再次打开
  closed: []
}>()

const visible = ref(false)
const submitting = ref(false)
const partId = ref(0)
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

watch(() => props.part, (part) => {
  if (!part) return
  partId.value = part.id
  form.projectId = part.projectId
  form.slug = part.slug
  form.name = part.name
  form.namespace = part.namespace
  form.repoUrl = part.repoUrl
  form.branch = part.branch
  form.forkOwner = part.forkOwner
  form.forkBranch = part.forkBranch
  form.fileMask = part.fileMask
  form.templatePath = part.templatePath
  fileMaskSync.value = part.fileMask === ''
  templatePathSync.value = part.templatePath === ''
  visible.value = true
})

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submit(): Promise<boolean> {
  const slug = form.slug.trim()
  const name = form.name.trim()
  const namespace = form.namespace.trim()
  const repoUrl = form.repoUrl.trim()
  if (!name || !namespace || !repoUrl) {
    Message.error(t('part.required_fields'))
    return false
  }
  if (!validSlug(slug)) {
    Message.error(t('slug.invalid'))
    return false
  }
  submitting.value = true
  try {
    const saved = await updatePart(partId.value, {
      projectId: form.projectId,
      slug,
      name,
      namespace,
      repoUrl,
      branch: form.branch.trim() || 'main',
      forkOwner: form.forkOwner.trim(),
      forkBranch: form.forkBranch.trim(),
      fileMask: fileMaskSync.value ? '' : form.fileMask.trim(),
      templatePath: templatePathSync.value ? '' : form.templatePath.trim(),
    })
    Message.success(t('part.saved'))
    emit('saved', saved)
    emit('closed')
    return true
  } catch (error) {
    console.error('保存部件配置失败:', error)
    Message.error(error instanceof Error ? error.message : t('part.save_failed'))
    return false
  } finally {
    submitting.value = false
  }
}

function close() {
  visible.value = false
  emit('closed')
}
</script>

<template>
  <a-modal
    v-model:visible="visible"
    :title="$t('part.edit_title')"
    :ok-loading="submitting"
    :on-before-ok="submit"
    @cancel="close"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item :label="$t('part.name')" required>
        <a-input v-model="form.name" allow-clear />
      </a-form-item>
      <a-form-item :label="$t('slug.label')" required :extra="$t('slug.hint')">
        <a-input v-model="form.slug" allow-clear />
      </a-form-item>
      <a-form-item :label="$t('part.namespace')" required>
        <a-input v-model="form.namespace" allow-clear />
      </a-form-item>

      <a-typography-title :heading="6" class="part-edit__group-title">VCS</a-typography-title>
      <a-form-item :label="$t('part.repo_url')" required>
        <a-input v-model="form.repoUrl" allow-clear />
      </a-form-item>
      <a-form-item :label="$t('part.branch')">
        <a-input v-model="form.branch" placeholder="main" allow-clear />
      </a-form-item>
      <a-form-item :label="$t('part.fork_owner')" :extra="$t('part.fork_owner_hint')">
        <a-input v-model="form.forkOwner" allow-clear />
      </a-form-item>
      <a-form-item :label="$t('part.fork_branch')">
        <a-input v-model="form.forkBranch" allow-clear />
      </a-form-item>

      <a-typography-title :heading="6" class="part-edit__group-title">{{ $t('part.files') }}</a-typography-title>
      <a-form-item :label="$t('part.file_mask')">
        <a-radio-group v-model="fileMaskSync" type="button" size="small">
          <a-radio :value="true">{{ $t('part.sync_from_project') }}</a-radio>
          <a-radio :value="false">{{ $t('part.custom') }}</a-radio>
        </a-radio-group>
        <a-input
          v-if="!fileMaskSync"
          v-model="form.fileMask"
          class="part-edit__sync-input"
          allow-clear
        />
        <a-typography-text v-else type="secondary" class="part-edit__sync-value">
          {{ projectFileMask || $t('part.not_configured') }}
        </a-typography-text>
      </a-form-item>
      <a-form-item :label="$t('part.template_path')">
        <a-radio-group v-model="templatePathSync" type="button" size="small">
          <a-radio :value="true">{{ $t('part.sync_from_project') }}</a-radio>
          <a-radio :value="false">{{ $t('part.custom') }}</a-radio>
        </a-radio-group>
        <a-input
          v-if="!templatePathSync"
          v-model="form.templatePath"
          class="part-edit__sync-input"
          allow-clear
        />
        <a-typography-text v-else type="secondary" class="part-edit__sync-value">
          {{ projectTemplatePath || $t('part.not_configured') }}
        </a-typography-text>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="scss">
.part-edit {
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
