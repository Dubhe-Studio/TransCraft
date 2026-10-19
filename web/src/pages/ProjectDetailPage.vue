<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import {
  addMember,
  projectDetail,
  projectLanguageProgress,
  projectMembers,
  projectProgress,
  removeMember,
  updateProject,
} from '../api/project'
import { supportedLanguages } from '../api/language'
import {
  createProjectGroup,
  deleteProjectGroup,
  projectGroups,
  updateProjectGroup,
} from '../api/group'
import { validSlug } from '../slug'
import type {
  LanguageInfo,
  LanguageProgress as LanguageProgressRow,
  PartProgress,
  ProgressRow,
  ProjectDetail,
  ProjectGroup,
  ProjectInput,
  ProjectMember,
  ProjectRole,
} from '../api/types'
import ProgressTable from '../components/ProgressTable.vue'
import LanguageProgress from '../components/LanguageProgress.vue'
import PartEditModal from '../components/PartEditModal.vue'
import { useUiStore } from '../stores/ui'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

// 项目以地址中的 slug 定位，内部接口再按解析出的 id 调用；slug 可被设置页修改，始终从地址实时取
const projectSlug = computed(() => String(route.params.slug))
const projectId = ref(0)

const detail = ref<ProjectDetail | null>(null)
const partRows = ref<PartProgress[]>([])
const memberList = ref<ProjectMember[]>([])
const groupList = ref<ProjectGroup[]>([])
const languageList = ref<LanguageInfo[]>([])
const languageRows = ref<LanguageProgressRow[]>([])
const loading = ref(true)
const loadError = ref('')

// 当前用户在项目内的角色，owner/maintainer 可见管理入口
const canManage = computed(() => detail.value?.role === 'owner' || detail.value?.role === 'maintainer')

function roleLabel(role: ProjectRole): string {
  return t(`member.role.${role}`)
}

// 路由组件复用（关注列表连续打开两个项目、设置页改 slug）时旧请求不得覆盖新数据
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    const project = await projectDetail(projectSlug.value)
    if (seq !== loadSeq) return
    projectId.value = project.id
    const [progressRows, members, groups, langs, langRows] = await Promise.all([
      projectProgress(project.id, ui.currentLanguage),
      projectMembers(project.id),
      projectGroups(project.id),
      supportedLanguages(),
      projectLanguageProgress(project.id),
    ])
    if (seq !== loadSeq) return
    detail.value = project
    partRows.value = progressRows
    memberList.value = members
    groupList.value = groups
    languageList.value = langs
    languageRows.value = langRows
    syncSettingsForm(project)
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载项目详情失败:', error)
    loadError.value = error instanceof Error ? error.message : t('project_detail.load_failed')
  } finally {
    if (seq === loadSeq) {
      loading.value = false
    }
  }
}

// 部件进度跟随当前工作语言变化；快速切换时旧请求不得覆盖新数据
let partsSeq = 0
watch(() => ui.currentLanguage, async () => {
  if (!projectId.value) return
  const seq = ++partsSeq
  try {
    const rows = await projectProgress(projectId.value, ui.currentLanguage)
    if (seq !== partsSeq) return
    partRows.value = rows
  } catch (error) {
    if (seq !== partsSeq) return
    console.error('加载部件进度失败:', error)
    Message.error(error instanceof Error ? error.message : t('project_detail.parts_load_failed'))
  }
})

onMounted(load)

// slug 在设置页可被修改，地址变化后按新标识重取
watch(() => route.params.slug, () => {
  if (route.name === 'project-detail') load()
})

// 添加成员
const addVisible = ref(false)
const addForm = reactive<{ username: string; role: ProjectRole }>({ username: '', role: 'translator' })
const addSubmitting = ref(false)

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submitAddMember(): Promise<boolean> {
  if (!addForm.username) {
    Message.error(t('member.username_required'))
    return false
  }
  addSubmitting.value = true
  try {
    memberList.value = await addMember(projectId.value, addForm.username, addForm.role)
    Message.success(t('member.added'))
    addForm.username = ''
    addForm.role = 'translator'
    return true
  } catch (error) {
    console.error('添加成员失败:', error)
    Message.error(error instanceof Error ? error.message : t('member.add_failed'))
    return false
  } finally {
    addSubmitting.value = false
  }
}

async function confirmRemove(member: ProjectMember) {
  try {
    await removeMember(projectId.value, member.username)
    memberList.value = memberList.value.filter((m) => m.username !== member.username)
    Message.success(t('member.removed', { name: member.displayName }))
  } catch (error) {
    console.error('移除成员失败:', error)
    Message.error(error instanceof Error ? error.message : t('member.remove_failed'))
  }
}

// 用户组编辑弹窗：editing 为 null 表示新建；批准权限单独用布尔承载，提交时展开为权限列表
const groupVisible = ref(false)
const groupEditing = ref<ProjectGroup | null>(null)
const groupForm = reactive<{ name: string; approve: boolean; members: string[] }>({
  name: '',
  approve: false,
  members: [],
})
const groupSubmitting = ref(false)

function openCreateGroup() {
  groupEditing.value = null
  groupForm.name = ''
  groupForm.approve = false
  groupForm.members = []
  groupVisible.value = true
}

function openEditGroup(group: ProjectGroup) {
  groupEditing.value = group
  groupForm.name = group.name
  groupForm.approve = group.permissions.includes('approve')
  groupForm.members = [...group.members]
  groupVisible.value = true
}

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submitGroup(): Promise<boolean> {
  const name = groupForm.name.trim()
  if (!name) {
    Message.error(t('project_detail.group.name_required'))
    return false
  }
  groupSubmitting.value = true
  const input = {
    name,
    permissions: groupForm.approve ? ['approve'] : [],
    members: groupForm.members,
  }
  try {
    const editing = groupEditing.value
    groupList.value = editing
      ? await updateProjectGroup(projectId.value, editing.id, input)
      : await createProjectGroup(projectId.value, input)
    Message.success(editing ? t('project_detail.group.updated') : t('project_detail.group.created'))
    return true
  } catch (error) {
    console.error('保存用户组失败:', error)
    Message.error(error instanceof Error ? error.message : t('project_detail.save_failed'))
    return false
  } finally {
    groupSubmitting.value = false
  }
}

async function confirmDeleteGroup(group: ProjectGroup) {
  try {
    await deleteProjectGroup(projectId.value, group.id)
    groupList.value = groupList.value.filter((item) => item.id !== group.id)
    Message.success(t('project_detail.group.deleted', { name: group.name }))
  } catch (error) {
    console.error('删除用户组失败:', error)
    Message.error(error instanceof Error ? error.message : t('project_detail.delete_failed'))
  }
}

// 设置表单，随项目详情同步；VCS 与部件文件配置在部件级管理，不在项目设置中
const settingsForm = reactive<ProjectInput>({
  name: '',
  slug: '',
  namespace: '',
  description: '',
  fileMask: '',
  templatePath: '',
  referenceLanguage: 'en_us',
})
const settingsSaving = ref(false)

function syncSettingsForm(project: ProjectDetail) {
  settingsForm.name = project.name
  settingsForm.slug = project.slug
  settingsForm.namespace = project.namespace
  settingsForm.description = project.description
  settingsForm.fileMask = project.fileMask
  settingsForm.templatePath = project.templatePath
  settingsForm.referenceLanguage = project.referenceLanguage
}

async function saveSettings() {
  const slug = settingsForm.slug.trim()
  if (!validSlug(slug)) {
    Message.error(t('slug.invalid'))
    return
  }
  settingsSaving.value = true
  try {
    detail.value = await updateProject(projectId.value, { ...settingsForm, slug })
    Message.success(t('project_detail.settings_saved'))
    // slug 改变后地址需要跟上新标识，历史记录里不留下旧地址
    if (slug !== projectSlug.value) {
      router.replace({ name: 'project-detail', params: { slug } })
    }
  } catch (error) {
    console.error('保存项目设置失败:', error)
    Message.error(error instanceof Error ? error.message : t('project_detail.save_failed'))
  } finally {
    settingsSaving.value = false
  }
}

// 经 store 的 setter 切换以写入本地记录，刷新后不丢语言；切换会触发 watch 重新加载
// Arco change 事件的值类型含多选数组形态，此处统一按单值取字符串
function changeLanguage(value: string | number | boolean | Record<string, unknown> | (string | number | boolean | Record<string, unknown>)[]) {
  ui.setCurrentLanguage(String(value))
}

// 部件配置弹窗由 PartEditModal 承载，这里只保存编辑目标
// 表格插槽只暴露 ProgressRow，部件的 VCS 等完整字段从 partRows 里按 id 取回
const partEditing = ref<PartProgress | null>(null)

function openEditPart(row: ProgressRow) {
  const part = partRows.value.find((p) => p.id === row.id)
  if (!part) return
  partEditing.value = part
}

async function onPartSaved() {
  // 进度行包含部件名称与地址标识等基础信息，保存后整体重取
  try {
    partRows.value = await projectProgress(projectId.value, ui.currentLanguage)
  } catch (error) {
    console.error('刷新部件进度失败:', error)
    Message.error(error instanceof Error ? error.message : t('project_detail.parts_refresh_failed'))
  }
}

function onPartModalClosed() {
  partEditing.value = null
}

// 表格插槽只暴露 ProgressRow，部件的地址标识从 partRows 里按 id 取回
function openPart(row: ProgressRow) {
  const part = partRows.value.find((p) => p.id === row.id)
  if (!part) return
  router.push({
    name: 'part-detail',
    params: { slug: projectSlug.value, partSlug: part.slug },
  })
}
</script>

<template>
  <div class="project-detail">
    <a-spin :loading="loading" class="project-detail__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">{{ $t('common.retry') }}</a-button>
        </template>
      </a-result>

      <template v-else-if="detail">
        <div class="project-detail__header">
          <div>
            <a-typography-title :heading="5" style="margin: 0">
              {{ detail.name }}
              <a-tag class="project-detail__namespace">{{ detail.namespace }}</a-tag>
            </a-typography-title>
            <a-typography-text type="secondary">{{ detail.description }}</a-typography-text>
          </div>
          <a-space>
            <a-tag color="arcoblue">{{ roleLabel(detail.role) }}</a-tag>
          </a-space>
        </div>

        <a-tabs default-active-key="parts">
          <a-tab-pane key="parts" :title="$t('project_detail.tab_parts')">
            <div class="project-detail__tab-actions">
              <a-select
                :model-value="ui.currentLanguage"
                class="project-detail__lang-select"
                @change="changeLanguage"
              >
                <a-option v-for="lang in languageList" :key="lang.code" :value="lang.code">
                  {{ lang.name }}
                </a-option>
              </a-select>
              <a-button
                v-if="canManage"
                type="primary"
                @click="router.push({ name: 'component-new', query: { project: String(projectId) } })"
              >
                <template #icon><icon-plus /></template>
                {{ $t('project_detail.add_part') }}
              </a-button>
            </div>
            <a-empty v-if="partRows.length === 0" :description="$t('project_detail.no_parts')" />
            <template v-else>
              <ProgressTable
                :rows="partRows"
                :name-label="$t('project_detail.part_label')"
                @row-click="openPart"
              >
                <template #name="{ row }">
                  {{ row.name }}
                  <a-button
                    v-if="canManage"
                    type="text"
                    size="mini"
                    @click.stop="openEditPart(row)"
                  >
                    {{ $t('project_detail.edit') }}
                  </a-button>
                </template>
              </ProgressTable>

              <a-typography-title :heading="6" class="project-detail__group-title">
                {{ $t('project_detail.language_progress_title') }}
              </a-typography-title>
              <LanguageProgress :rows="languageRows" />
            </template>
          </a-tab-pane>

          <a-tab-pane key="members" :title="$t('project_detail.tab_members')">
            <div v-if="canManage" class="project-detail__tab-actions">
              <a-button type="primary" @click="addVisible = true">
                <template #icon><icon-plus /></template>
                {{ $t('member.add') }}
              </a-button>
            </div>
            <a-table :data="memberList" :pagination="false">
              <template #columns>
                <a-table-column :title="$t('member.col_username')" data-index="username" />
                <a-table-column :title="$t('member.col_display_name')" data-index="displayName" />
                <a-table-column :title="$t('member.col_role')">
                  <template #cell="{ record }">
                    {{ roleLabel((record as ProjectMember).role) }}
                  </template>
                </a-table-column>
                <a-table-column v-if="canManage" :title="$t('member.col_action')" :width="120">
                  <template #cell="{ record }">
                    <a-popconfirm
                      :content="$t('member.remove_confirm')"
                      @ok="confirmRemove(record as ProjectMember)"
                    >
                      <a-button type="text" status="danger" size="small">{{ $t('member.remove') }}</a-button>
                    </a-popconfirm>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane v-if="canManage" key="groups" :title="$t('project_detail.tab_groups')">
            <div class="project-detail__tab-actions">
              <a-button type="primary" @click="openCreateGroup">
                <template #icon><icon-plus /></template>
                {{ $t('project_detail.group.new') }}
              </a-button>
            </div>
            <a-table :data="groupList" :pagination="false">
              <template #columns>
                <a-table-column :title="$t('project_detail.group.name')" data-index="name" />
                <a-table-column :title="$t('project_detail.group.permissions')" :width="120">
                  <template #cell="{ record }">
                    <a-tag v-if="(record as ProjectGroup).permissions.includes('approve')" color="green">
                      {{ $t('project_detail.group.approve') }}
                    </a-tag>
                    <a-typography-text v-else type="secondary">{{ $t('project_detail.group.none') }}</a-typography-text>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('project_detail.group.members')">
                  <template #cell="{ record }">
                    <a-space v-if="(record as ProjectGroup).members.length > 0" wrap>
                      <a-tag v-for="member in (record as ProjectGroup).members" :key="member">{{ member }}</a-tag>
                    </a-space>
                    <a-typography-text v-else type="secondary">{{ $t('project_detail.group.no_members') }}</a-typography-text>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('project_detail.group.action')" :width="160">
                  <template #cell="{ record }">
                    <a-space>
                      <a-button type="text" size="small" @click="openEditGroup(record as ProjectGroup)">{{ $t('project_detail.edit') }}</a-button>
                      <a-popconfirm
                        :content="$t('project_detail.group.delete_confirm')"
                        @ok="confirmDeleteGroup(record as ProjectGroup)"
                      >
                        <a-button type="text" status="danger" size="small">{{ $t('project_detail.delete') }}</a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane v-if="canManage" key="settings" :title="$t('project_detail.tab_settings')">
            <a-form :model="settingsForm" layout="vertical" class="project-detail__settings" @submit-success="saveSettings">
              <a-typography-title :heading="6" class="project-detail__group-title">{{ $t('project_detail.basic') }}</a-typography-title>
              <a-form-item field="name" :label="$t('project.name')" required :rules="[{ required: true, message: $t('project.name_required') }]">
                <a-input v-model="settingsForm.name" allow-clear />
              </a-form-item>
              <a-form-item field="slug" :label="$t('slug.label')" required :extra="$t('slug.hint')">
                <a-input v-model="settingsForm.slug" allow-clear />
              </a-form-item>
              <a-form-item field="namespace" :label="$t('project.namespace')" required :rules="[{ required: true, message: $t('project.namespace_required') }]">
                <a-input v-model="settingsForm.namespace" allow-clear />
              </a-form-item>
              <a-form-item field="description" :label="$t('project.description')">
                <a-textarea v-model="settingsForm.description" :auto-size="{ minRows: 2 }" allow-clear />
              </a-form-item>

              <a-typography-title :heading="6" class="project-detail__group-title">{{ $t('project_detail.files') }}</a-typography-title>
              <a-form-item field="fileMask" :label="$t('project.file_mask')">
                <a-input v-model="settingsForm.fileMask" allow-clear />
              </a-form-item>
              <a-form-item field="templatePath" :label="$t('project.template_path')">
                <a-input v-model="settingsForm.templatePath" allow-clear />
              </a-form-item>

              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="settingsSaving">{{ $t('project_detail.save_settings') }}</a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>

        <a-modal v-model:visible="groupVisible" :title="groupEditing ? $t('project_detail.group.edit_title') : $t('project_detail.group.new')" :ok-loading="groupSubmitting" :on-before-ok="submitGroup">
          <a-form :model="groupForm" layout="vertical">
            <a-form-item :label="$t('project_detail.group.name')" required>
              <a-input v-model="groupForm.name" :placeholder="$t('project_detail.group.name_placeholder')" allow-clear />
            </a-form-item>
            <a-form-item :label="$t('project_detail.group.permissions')">
              <a-checkbox v-model="groupForm.approve">{{ $t('project_detail.group.approve') }}</a-checkbox>
            </a-form-item>
            <a-form-item :label="$t('project_detail.group.members')">
              <a-select
                v-model="groupForm.members"
                multiple
                allow-create
                :placeholder="$t('project_detail.group.members_placeholder')"
              />
            </a-form-item>
          </a-form>
        </a-modal>

        <PartEditModal
          :part="partEditing"
          :project-file-mask="detail.fileMask"
          :project-template-path="detail.templatePath"
          @saved="onPartSaved"
          @closed="onPartModalClosed"
        />

        <a-modal v-model:visible="addVisible" :title="$t('member.add')" :ok-loading="addSubmitting" :on-before-ok="submitAddMember">
          <a-form :model="addForm" layout="vertical">
            <a-form-item :label="$t('member.col_username')" required>
              <a-input v-model="addForm.username" :placeholder="$t('member.username_placeholder')" allow-clear />
            </a-form-item>
            <a-form-item :label="$t('member.col_role')">
              <a-select v-model="addForm.role">
                <a-option value="translator">{{ $t('member.role.translator') }}</a-option>
                <a-option value="maintainer">{{ $t('member.role.maintainer') }}</a-option>
                <a-option value="owner">{{ $t('member.role.owner') }}</a-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>
      </template>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.project-detail {
  &__spin {
    width: 100%;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
  }

  &__namespace {
    margin-left: 8px;
  }

  &__tab-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__lang-select {
    width: 200px;
  }

  &__settings {
    max-width: 640px;
  }

  &__group-title {
    margin: 8px 0 12px;
  }
}
</style>
