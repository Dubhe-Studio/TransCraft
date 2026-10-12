<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { adminUsers, createInvite, deleteInvite, invites, updateUserRole } from '../api/admin'
import { siteLinks, updateSiteLinks } from '../api/site'
import type { AdminUser, InviteCode, SiteLinks, UserRole } from '../api/types'

const userList = ref<AdminUser[]>([])
const inviteList = ref<InviteCode[]>([])
const linksForm = reactive<SiteLinks>({ contact: '', docs: '', contribute: '', support: '' })

const loading = ref(true)
const loadError = ref('')
const inviteCreating = ref(false)
const linksSaving = ref(false)

const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  owner: '站点所有者',
  user: '普通用户',
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [users, codes, links] = await Promise.all([adminUsers(), invites(), siteLinks()])
    userList.value = users
    inviteList.value = codes
    linksForm.contact = links.contact
    linksForm.docs = links.docs
    linksForm.contribute = links.contribute
    linksForm.support = links.support
  } catch (error) {
    console.error('加载管理数据失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function changeRole(user: AdminUser, role: UserRole) {
  try {
    await updateUserRole(user.username, role)
    Message.success(`已将 ${user.displayName} 的角色调整为${roleLabels[role]}`)
  } catch (error) {
    console.error('调整用户角色失败:', error)
    Message.error(error instanceof Error ? error.message : '调整失败')
    await load()
  }
}

async function generateInvite() {
  inviteCreating.value = true
  try {
    const created = await createInvite()
    inviteList.value = [created, ...inviteList.value]
    Message.success('邀请码已生成')
  } catch (error) {
    console.error('生成邀请码失败:', error)
    Message.error(error instanceof Error ? error.message : '生成失败')
  } finally {
    inviteCreating.value = false
  }
}

async function revokeInvite(invite: InviteCode) {
  try {
    await deleteInvite(invite.code)
    inviteList.value = inviteList.value.filter((item) => item.code !== invite.code)
    Message.success(`邀请码 ${invite.code} 已撤销`)
  } catch (error) {
    console.error('撤销邀请码失败:', error)
    Message.error(error instanceof Error ? error.message : '撤销失败')
  }
}

async function saveLinks() {
  linksSaving.value = true
  try {
    await updateSiteLinks({ ...linksForm })
    Message.success('站点链接已保存，顶栏"更多"菜单即时生效')
  } catch (error) {
    console.error('保存站点链接失败:', error)
    Message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    linksSaving.value = false
  }
}
</script>

<template>
  <div class="admin">
    <a-typography-title :heading="5">管理</a-typography-title>

    <a-spin :loading="loading" class="admin__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
        </template>
      </a-result>

      <a-tabs v-else default-active-key="users">
        <a-tab-pane key="users" title="用户管理">
          <a-table :data="userList" :pagination="false">
            <template #columns>
              <a-table-column title="用户名" data-index="username" />
              <a-table-column title="显示名" data-index="displayName" />
              <a-table-column title="邮箱" data-index="email" />
              <a-table-column title="角色" :width="160">
                <template #cell="{ record }">
                  <a-select
                    :model-value="(record as AdminUser).role"
                    size="small"
                    @change="(role) => changeRole(record as AdminUser, role as UserRole)"
                  >
                    <a-option value="user">普通用户</a-option>
                    <a-option value="admin">管理员</a-option>
                    <a-option value="owner">站点所有者</a-option>
                  </a-select>
                </template>
              </a-table-column>
              <a-table-column title="注册时间" data-index="createdAt" :width="120" />
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="invites" title="邀请码">
          <div class="admin__tab-actions">
            <a-button type="primary" :loading="inviteCreating" @click="generateInvite">
              <template #icon><icon-plus /></template>
              生成邀请码
            </a-button>
          </div>
          <a-table :data="inviteList" :pagination="false">
            <template #columns>
              <a-table-column title="邀请码" data-index="code" />
              <a-table-column title="创建时间" data-index="createdAt" :width="120" />
              <a-table-column title="使用状态">
                <template #cell="{ record }">
                  <a-tag v-if="(record as InviteCode).usedBy" color="gray">
                    已被 {{ (record as InviteCode).usedBy }} 使用
                  </a-tag>
                  <a-tag v-else color="green">未使用</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="120">
                <template #cell="{ record }">
                  <a-popconfirm
                    content="确定撤销该邀请码？"
                    @ok="revokeInvite(record as InviteCode)"
                  >
                    <a-button type="text" status="danger" size="small">撤销</a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="site-links" title="站点链接">
          <a-form :model="linksForm" layout="vertical" class="admin__links" @submit-success="saveLinks">
            <a-form-item label="联系管理员" extra="留空则顶栏「更多」菜单不展示该项，支持 mailto: 地址">
              <a-input v-model="linksForm.contact" placeholder="mailto:admin@example.com" allow-clear />
            </a-form-item>
            <a-form-item label="文档">
              <a-input v-model="linksForm.docs" placeholder="https://…" allow-clear />
            </a-form-item>
            <a-form-item label="贡献">
              <a-input v-model="linksForm.contribute" placeholder="https://…" allow-clear />
            </a-form-item>
            <a-form-item label="支持">
              <a-input v-model="linksForm.support" placeholder="https://…" allow-clear />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" :loading="linksSaving">保存站点链接</a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-spin>
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
