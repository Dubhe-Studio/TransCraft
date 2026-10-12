<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  addMember,
  projectDetail,
  projectMembers,
  projectProgress,
  removeMember,
  updateProject,
} from '../api/project'
import {
  createProjectGroup,
  deleteProjectGroup,
  projectGroups,
  updateProjectGroup,
} from '../api/group'
import type {
  PartProgress,
  ProjectDetail,
  ProjectGroup,
  ProjectInput,
  ProjectMember,
  ProjectRole,
} from '../api/types'
import ProgressTable from '../components/ProgressTable.vue'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

const projectId = Number(route.params.id)

const detail = ref<ProjectDetail | null>(null)
const partRows = ref<PartProgress[]>([])
const memberList = ref<ProjectMember[]>([])
const groupList = ref<ProjectGroup[]>([])
const loading = ref(true)
const loadError = ref('')

// 当前用户在项目内的角色，owner/maintainer 可见管理入口
const canManage = computed(() => detail.value?.role === 'owner' || detail.value?.role === 'maintainer')

const roleLabels: Record<ProjectRole, string> = {
  owner: '所有者',
  maintainer: '维护者',
  translator: '译者',
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [project, progressRows, members, groups] = await Promise.all([
      projectDetail(projectId),
      projectProgress(projectId, ui.currentLanguage),
      projectMembers(projectId),
      projectGroups(projectId),
    ])
    detail.value = project
    partRows.value = progressRows
    memberList.value = members
    groupList.value = groups
    syncSettingsForm(project)
  } catch (error) {
    console.error('加载项目详情失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

// 部件进度跟随当前工作语言变化；快速切换时旧请求不得覆盖新数据
let partsSeq = 0
watch(() => ui.currentLanguage, async () => {
  const seq = ++partsSeq
  try {
    const rows = await projectProgress(projectId, ui.currentLanguage)
    if (seq !== partsSeq) return
    partRows.value = rows
  } catch (error) {
    if (seq !== partsSeq) return
    console.error('加载部件进度失败:', error)
    Message.error(error instanceof Error ? error.message : '加载部件进度失败')
  }
})

onMounted(load)

// 添加成员
const addVisible = ref(false)
const addForm = reactive<{ username: string; role: ProjectRole }>({ username: '', role: 'translator' })
const addSubmitting = ref(false)

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submitAddMember(): Promise<boolean> {
  if (!addForm.username) {
    Message.error('用户名不能为空')
    return false
  }
  addSubmitting.value = true
  try {
    memberList.value = await addMember(projectId, addForm.username, addForm.role)
    Message.success('成员已添加')
    addForm.username = ''
    addForm.role = 'translator'
    return true
  } catch (error) {
    console.error('添加成员失败:', error)
    Message.error(error instanceof Error ? error.message : '添加失败')
    return false
  } finally {
    addSubmitting.value = false
  }
}

async function confirmRemove(member: ProjectMember) {
  try {
    await removeMember(projectId, member.username)
    memberList.value = memberList.value.filter((m) => m.username !== member.username)
    Message.success(`已移除 ${member.displayName}`)
  } catch (error) {
    console.error('移除成员失败:', error)
    Message.error(error instanceof Error ? error.message : '移除失败')
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
    Message.error('用户组名称不能为空')
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
      ? await updateProjectGroup(projectId, editing.id, input)
      : await createProjectGroup(projectId, input)
    Message.success(editing ? '用户组已更新' : '用户组已创建')
    return true
  } catch (error) {
    console.error('保存用户组失败:', error)
    Message.error(error instanceof Error ? error.message : '保存失败')
    return false
  } finally {
    groupSubmitting.value = false
  }
}

async function confirmDeleteGroup(group: ProjectGroup) {
  try {
    await deleteProjectGroup(projectId, group.id)
    groupList.value = groupList.value.filter((item) => item.id !== group.id)
    Message.success(`用户组 ${group.name} 已删除`)
  } catch (error) {
    console.error('删除用户组失败:', error)
    Message.error(error instanceof Error ? error.message : '删除失败')
  }
}

// 设置表单，随项目详情同步
const settingsForm = reactive<ProjectInput>({
  name: '',
  namespace: '',
  description: '',
  repoUrl: '',
  branch: '',
  forkOwner: '',
  forkBranch: '',
  fileMask: '',
  templatePath: '',
  referenceLanguage: 'en_us',
})
const settingsSaving = ref(false)

function syncSettingsForm(project: ProjectDetail) {
  settingsForm.name = project.name
  settingsForm.namespace = project.namespace
  settingsForm.description = project.description
  settingsForm.repoUrl = project.repoUrl
  settingsForm.branch = project.branch
  settingsForm.forkOwner = project.forkOwner
  settingsForm.forkBranch = project.forkBranch
  settingsForm.fileMask = project.fileMask
  settingsForm.templatePath = project.templatePath
  settingsForm.referenceLanguage = project.referenceLanguage
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    detail.value = await updateProject(projectId, { ...settingsForm })
    Message.success('设置已保存')
  } catch (error) {
    console.error('保存项目设置失败:', error)
    Message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    settingsSaving.value = false
  }
}
</script>

<template>
  <div class="project-detail">
    <a-spin :loading="loading" class="project-detail__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
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
            <a-tag color="arcoblue">{{ roleLabels[detail.role] }}</a-tag>
            <a-link :href="detail.repoUrl" target="_blank">{{ detail.repoUrl }}</a-link>
            <a-tag>分支 {{ detail.branch }}</a-tag>
          </a-space>
        </div>

        <a-tabs default-active-key="parts">
          <a-tab-pane key="parts" title="部件">
            <div v-if="canManage" class="project-detail__tab-actions">
              <a-button type="primary" @click="router.push({ name: 'component-new' })">
                <template #icon><icon-plus /></template>
                添加部件
              </a-button>
            </div>
            <a-empty v-if="partRows.length === 0" description="还没有部件" />
            <ProgressTable
              v-else
              :rows="partRows"
              name-label="部件"
              @row-click="(row) => router.push({ name: 'part-translate', params: { id: row.id } })"
            />
          </a-tab-pane>

          <a-tab-pane key="members" title="成员">
            <div v-if="canManage" class="project-detail__tab-actions">
              <a-button type="primary" @click="addVisible = true">
                <template #icon><icon-plus /></template>
                添加成员
              </a-button>
            </div>
            <a-table :data="memberList" :pagination="false">
              <template #columns>
                <a-table-column title="用户名" data-index="username" />
                <a-table-column title="显示名" data-index="displayName" />
                <a-table-column title="角色">
                  <template #cell="{ record }">
                    {{ roleLabels[(record as ProjectMember).role] }}
                  </template>
                </a-table-column>
                <a-table-column v-if="canManage" title="操作" :width="120">
                  <template #cell="{ record }">
                    <a-popconfirm
                      content="确定移除该成员？"
                      @ok="confirmRemove(record as ProjectMember)"
                    >
                      <a-button type="text" status="danger" size="small">移除</a-button>
                    </a-popconfirm>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane v-if="canManage" key="groups" title="用户组">
            <div class="project-detail__tab-actions">
              <a-button type="primary" @click="openCreateGroup">
                <template #icon><icon-plus /></template>
                新建用户组
              </a-button>
            </div>
            <a-table :data="groupList" :pagination="false">
              <template #columns>
                <a-table-column title="名称" data-index="name" />
                <a-table-column title="权限" :width="120">
                  <template #cell="{ record }">
                    <a-tag v-if="(record as ProjectGroup).permissions.includes('approve')" color="green">
                      批准译文
                    </a-tag>
                    <a-typography-text v-else type="secondary">无</a-typography-text>
                  </template>
                </a-table-column>
                <a-table-column title="成员">
                  <template #cell="{ record }">
                    <a-space v-if="(record as ProjectGroup).members.length > 0" wrap>
                      <a-tag v-for="member in (record as ProjectGroup).members" :key="member">{{ member }}</a-tag>
                    </a-space>
                    <a-typography-text v-else type="secondary">暂无成员</a-typography-text>
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="160">
                  <template #cell="{ record }">
                    <a-space>
                      <a-button type="text" size="small" @click="openEditGroup(record as ProjectGroup)">编辑</a-button>
                      <a-popconfirm
                        content="确定删除该用户组？"
                        @ok="confirmDeleteGroup(record as ProjectGroup)"
                      >
                        <a-button type="text" status="danger" size="small">删除</a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane v-if="canManage" key="settings" title="设置">
            <a-form :model="settingsForm" layout="vertical" class="project-detail__settings" @submit-success="saveSettings">
              <a-typography-title :heading="6" class="project-detail__group-title">基本信息</a-typography-title>
              <a-form-item field="name" label="项目名称" required :rules="[{ required: true, message: '项目名称不能为空' }]">
                <a-input v-model="settingsForm.name" allow-clear />
              </a-form-item>
              <a-form-item field="namespace" label="命名空间" required :rules="[{ required: true, message: '命名空间不能为空' }]">
                <a-input v-model="settingsForm.namespace" allow-clear />
              </a-form-item>
              <a-form-item field="description" label="项目简介">
                <a-textarea v-model="settingsForm.description" :auto-size="{ minRows: 2 }" allow-clear />
              </a-form-item>

              <a-typography-title :heading="6" class="project-detail__group-title">VCS</a-typography-title>
              <a-form-item field="repoUrl" label="仓库地址" required :rules="[{ required: true, message: '仓库地址不能为空' }]">
                <a-input v-model="settingsForm.repoUrl" allow-clear />
              </a-form-item>
              <a-form-item field="branch" label="分支">
                <a-input v-model="settingsForm.branch" allow-clear />
              </a-form-item>
              <a-form-item field="forkOwner" label="Fork 所有者" extra="留空表示直接向原仓库提交翻译">
                <a-input v-model="settingsForm.forkOwner" allow-clear />
              </a-form-item>
              <a-form-item field="forkBranch" label="Fork 分支">
                <a-input v-model="settingsForm.forkBranch" allow-clear />
              </a-form-item>

              <a-typography-title :heading="6" class="project-detail__group-title">文件</a-typography-title>
              <a-form-item field="fileMask" label="语言文件掩码">
                <a-input v-model="settingsForm.fileMask" allow-clear />
              </a-form-item>
              <a-form-item field="templatePath" label="翻译模板文件">
                <a-input v-model="settingsForm.templatePath" allow-clear />
              </a-form-item>

              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="settingsSaving">保存设置</a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>

        <a-modal v-model:visible="groupVisible" :title="groupEditing ? '编辑用户组' : '新建用户组'" :ok-loading="groupSubmitting" :on-before-ok="submitGroup">
          <a-form :model="groupForm" layout="vertical">
            <a-form-item label="名称" required>
              <a-input v-model="groupForm.name" placeholder="输入用户组名称" allow-clear />
            </a-form-item>
            <a-form-item label="权限">
              <a-checkbox v-model="groupForm.approve">批准译文</a-checkbox>
            </a-form-item>
            <a-form-item label="成员">
              <a-select
                v-model="groupForm.members"
                multiple
                allow-create
                placeholder="输入用户名后回车添加成员"
              />
            </a-form-item>
          </a-form>
        </a-modal>

        <a-modal v-model:visible="addVisible" title="添加成员" :ok-loading="addSubmitting" :on-before-ok="submitAddMember">
          <a-form :model="addForm" layout="vertical">
            <a-form-item label="用户名" required>
              <a-input v-model="addForm.username" placeholder="输入用户名" allow-clear />
            </a-form-item>
            <a-form-item label="角色">
              <a-select v-model="addForm.role">
                <a-option value="translator">译者</a-option>
                <a-option value="maintainer">维护者</a-option>
                <a-option value="owner">所有者</a-option>
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
    margin-bottom: 12px;
  }

  &__settings {
    max-width: 640px;
  }

  &__group-title {
    margin: 8px 0 12px;
  }
}
</style>
