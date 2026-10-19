<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import {
  adminUsers,
  createInvite,
  createSiteGroup,
  deleteInvite,
  deleteSiteGroup,
  invites,
  siteGroups,
  updateSiteGroup,
  updateUserRole,
} from '../api/admin'
import { siteLinks, updateSiteLinks } from '../api/site'
import { formatDate } from '../format'
import { useLocaleStore } from '@/i18n'
import type { AdminUser, InviteCode, SiteGroup, SiteGroupInput, SiteLinks, UserRole } from '../api/types'

const { t } = useI18n()

const localeStore = useLocaleStore()

const userList = ref<AdminUser[]>([])
const inviteList = ref<InviteCode[]>([])
const groupList = ref<SiteGroup[]>([])
const linksForm = reactive<SiteLinks>({ contact: '', docs: '', contribute: '', support: '' })

const loading = ref(true)
const loadError = ref('')
const inviteCreating = ref(false)
const linksSaving = ref(false)

function roleLabel(role: UserRole): string {
  return t(`admin.role.${role}`)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [users, codes, groups, links] = await Promise.all([adminUsers(), invites(), siteGroups(), siteLinks()])
    userList.value = users
    inviteList.value = codes
    groupList.value = groups
    linksForm.contact = links.contact
    linksForm.docs = links.docs
    linksForm.contribute = links.contribute
    linksForm.support = links.support
  } catch (error) {
    console.error('加载管理数据失败:', error)
    loadError.value = error instanceof Error ? error.message : t('admin.load_failed')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function changeRole(user: AdminUser, role: UserRole) {
  try {
    await updateUserRole(user.username, role)
    user.role = role
    Message.success(t('admin.role_changed', { name: user.displayName, role: roleLabel(role) }))
  } catch (error) {
    console.error('调整用户角色失败:', error)
    Message.error(error instanceof Error ? error.message : t('admin.role_change_failed'))
    await load()
  }
}

async function generateInvite() {
  inviteCreating.value = true
  try {
    const created = await createInvite()
    inviteList.value = [created, ...inviteList.value]
    Message.success(t('admin.invite_created'))
  } catch (error) {
    console.error('生成邀请码失败:', error)
    Message.error(error instanceof Error ? error.message : t('admin.invite_create_failed'))
  } finally {
    inviteCreating.value = false
  }
}

async function revokeInvite(invite: InviteCode) {
  try {
    await deleteInvite(invite.code)
    inviteList.value = inviteList.value.filter((item) => item.code !== invite.code)
    Message.success(t('admin.invite_revoked', { code: invite.code }))
  } catch (error) {
    console.error('撤销邀请码失败:', error)
    Message.error(error instanceof Error ? error.message : t('admin.invite_revoke_failed'))
  }
}

async function saveLinks() {
  linksSaving.value = true
  try {
    await updateSiteLinks({ ...linksForm })
    Message.success(t('admin.links_saved'))
  } catch (error) {
    console.error('保存站点链接失败:', error)
    Message.error(error instanceof Error ? error.message : t('admin.save_failed'))
  } finally {
    linksSaving.value = false
  }
}

// 用户组编辑弹窗：editing 为 null 表示新建
const groupVisible = ref(false)
const groupEditing = ref<SiteGroup | null>(null)
const groupForm = reactive<SiteGroupInput>({ name: '', members: [] })
const groupSubmitting = ref(false)

function openCreateGroup() {
  groupEditing.value = null
  groupForm.name = ''
  groupForm.members = []
  groupVisible.value = true
}

function openEditGroup(group: SiteGroup) {
  groupEditing.value = group
  groupForm.name = group.name
  groupForm.members = [...group.members]
  groupVisible.value = true
}

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submitGroup(): Promise<boolean> {
  const name = groupForm.name.trim()
  if (!name) {
    Message.error(t('admin.group_name_required'))
    return false
  }
  groupSubmitting.value = true
  try {
    const editing = groupEditing.value
    groupList.value = editing
      ? await updateSiteGroup(editing.id, { name, members: groupForm.members })
      : await createSiteGroup({ name, members: groupForm.members })
    Message.success(editing ? t('admin.group_updated') : t('admin.group_created'))
    return true
  } catch (error) {
    console.error('保存用户组失败:', error)
    Message.error(error instanceof Error ? error.message : t('admin.save_failed'))
    return false
  } finally {
    groupSubmitting.value = false
  }
}

async function confirmDeleteGroup(group: SiteGroup) {
  try {
    await deleteSiteGroup(group.id)
    groupList.value = groupList.value.filter((item) => item.id !== group.id)
    Message.success(t('admin.group_deleted', { name: group.name }))
  } catch (error) {
    console.error('删除用户组失败:', error)
    Message.error(error instanceof Error ? error.message : t('admin.delete_failed'))
  }
}
</script>

<template>
  <div class="admin">
    <a-typography-title :heading="5">{{ $t('admin.title') }}</a-typography-title>

    <a-spin :loading="loading" class="admin__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">{{ $t('common.retry') }}</a-button>
        </template>
      </a-result>

      <a-tabs v-else default-active-key="users">
        <a-tab-pane key="users" :title="$t('admin.tab_users')">
          <a-table :data="userList" :pagination="false">
            <template #columns>
              <a-table-column :title="$t('admin.col_username')" data-index="username" />
              <a-table-column :title="$t('admin.col_display_name')" data-index="displayName" />
              <a-table-column :title="$t('admin.col_email')" data-index="email" />
              <a-table-column :title="$t('admin.col_role')" :width="160">
                <template #cell="{ record }">
                  <a-select
                    :model-value="(record as AdminUser).role"
                    size="small"
                    @change="(role) => changeRole(record as AdminUser, role as UserRole)"
                  >
                    <a-option value="user">{{ $t('admin.role.user') }}</a-option>
                    <a-option value="admin">{{ $t('admin.role.admin') }}</a-option>
                    <a-option value="owner">{{ $t('admin.role.owner') }}</a-option>
                  </a-select>
                </template>
              </a-table-column>
              <a-table-column :title="$t('admin.col_registered_at')" :width="120">
                <template #cell="{ record }">
                  {{ formatDate((record as AdminUser).createdAt, localeStore.current.bcp47) }}
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="invites" :title="$t('admin.tab_invites')">
          <div class="admin__tab-actions">
            <a-button type="primary" :loading="inviteCreating" @click="generateInvite">
              <template #icon><icon-plus /></template>
              {{ $t('admin.generate_invite') }}
            </a-button>
          </div>
          <a-table :data="inviteList" :pagination="false">
            <template #columns>
              <a-table-column :title="$t('admin.invite_code')" data-index="code" />
              <a-table-column :title="$t('admin.col_created_at')" :width="120">
                <template #cell="{ record }">
                  {{ formatDate((record as InviteCode).createdAt, localeStore.current.bcp47) }}
                </template>
              </a-table-column>
              <a-table-column :title="$t('admin.col_status')">
                <template #cell="{ record }">
                  <a-tag v-if="(record as InviteCode).usedBy" color="gray">
                    {{ $t('admin.invite_used_by', { name: (record as InviteCode).usedBy }) }}
                  </a-tag>
                  <a-tag v-else color="green">{{ $t('admin.invite_unused') }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="$t('admin.col_action')" :width="120">
                <template #cell="{ record }">
                  <a-popconfirm
                    :content="$t('admin.invite_revoke_confirm')"
                    @ok="revokeInvite(record as InviteCode)"
                  >
                    <a-button type="text" status="danger" size="small">{{ $t('admin.revoke') }}</a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="groups" :title="$t('admin.tab_groups')">
          <div class="admin__tab-actions">
            <a-button type="primary" @click="openCreateGroup">
              <template #icon><icon-plus /></template>
              {{ $t('admin.create_group') }}
            </a-button>
          </div>
          <a-table :data="groupList" :pagination="false">
            <template #columns>
              <a-table-column :title="$t('admin.name')" data-index="name" />
              <a-table-column :title="$t('admin.members')">
                <template #cell="{ record }">
                  <a-space v-if="(record as SiteGroup).members.length > 0" wrap>
                    <a-tag v-for="member in (record as SiteGroup).members" :key="member">{{ member }}</a-tag>
                  </a-space>
                  <a-typography-text v-else type="secondary">{{ $t('admin.no_members') }}</a-typography-text>
                </template>
              </a-table-column>
              <a-table-column :title="$t('admin.col_action')" :width="160">
                <template #cell="{ record }">
                  <a-space>
                    <a-button type="text" size="small" @click="openEditGroup(record as SiteGroup)">
                      {{ $t('admin.edit') }}
                    </a-button>
                    <a-popconfirm
                      :content="$t('admin.group_delete_confirm')"
                      @ok="confirmDeleteGroup(record as SiteGroup)"
                    >
                      <a-button type="text" status="danger" size="small">{{ $t('admin.delete') }}</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="site-links" :title="$t('admin.tab_site_links')">
          <a-form :model="linksForm" layout="vertical" class="admin__links" @submit-success="saveLinks">
            <a-form-item :label="$t('admin.contact')" :extra="$t('admin.contact_hint')">
              <a-input v-model="linksForm.contact" placeholder="mailto:admin@example.com" allow-clear />
            </a-form-item>
            <a-form-item :label="$t('admin.docs')">
              <a-input v-model="linksForm.docs" placeholder="https://…" allow-clear />
            </a-form-item>
            <a-form-item :label="$t('admin.contribute')">
              <a-input v-model="linksForm.contribute" placeholder="https://…" allow-clear />
            </a-form-item>
            <a-form-item :label="$t('admin.support')">
              <a-input v-model="linksForm.support" placeholder="https://…" allow-clear />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" :loading="linksSaving">{{ $t('admin.save_site_links') }}</a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-spin>

    <a-modal
      v-model:visible="groupVisible"
      :title="groupEditing ? $t('admin.edit_group') : $t('admin.new_group')"
      :ok-loading="groupSubmitting"
      :on-before-ok="submitGroup"
    >
      <a-form :model="groupForm" layout="vertical">
        <a-form-item :label="$t('admin.name')" required>
          <a-input v-model="groupForm.name" :placeholder="$t('admin.group_name_placeholder')" allow-clear />
        </a-form-item>
        <a-form-item :label="$t('admin.members')">
          <a-select
            v-model="groupForm.members"
            multiple
            allow-create
            :placeholder="$t('admin.group_members_placeholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.admin {
  &__spin {
    width: 100%;
  }

  &__tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  &__links {
    max-width: 640px;
  }
}
</style>
