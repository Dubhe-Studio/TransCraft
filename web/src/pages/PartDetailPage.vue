<script setup lang="ts">
// 部件页：以 项目 slug + 部件 slug 寻址，列出各语言完成情况并管理部件级成员角色
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { projectDetail } from '../api/project'
import {
  addPartMember,
  partDetailBySlug,
  partLanguageProgressBySlug,
  partMembers,
  removePartMember,
} from '../api/part'
import { toLangSegment } from '../langSegment'
import type {
  LanguageProgress as LanguageProgressRow,
  Part,
  PartDetail,
  PartMember,
  PartRole,
  ProjectDetail,
} from '../api/types'
import LanguageProgress from '../components/LanguageProgress.vue'
import PartEditModal from '../components/PartEditModal.vue'

const route = useRoute()
const router = useRouter()

// slug 可被配置弹窗修改，始终从地址实时取
const projectSlug = computed(() => String(route.params.slug))
const partSlug = computed(() => String(route.params.partSlug))

const project = ref<ProjectDetail | null>(null)
const part = ref<PartDetail | null>(null)
const languageRows = ref<LanguageProgressRow[]>([])
const memberList = ref<PartMember[]>([])
const loading = ref(true)
const loadError = ref('')

// 项目所有者/维护者可配置部件成员与部件配置
const canManage = computed(() => project.value?.role === 'owner' || project.value?.role === 'maintainer')

const roleLabels: Record<PartRole, string> = {
  maintainer: '维护者',
  translator: '译者',
}

// 地址变化触发重取（路由组件复用）时旧请求不得覆盖新数据
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    // 成员接口按部件 id 调用，从详情解析出 id 后链入同一批请求
    const partPromise = partDetailBySlug(projectSlug.value, partSlug.value)
    const [projectData, partData, langRows, members] = await Promise.all([
      projectDetail(projectSlug.value),
      partPromise,
      partLanguageProgressBySlug(projectSlug.value, partSlug.value),
      partPromise.then((p) => partMembers(p.id)),
    ])
    if (seq !== loadSeq) return
    project.value = projectData
    part.value = partData
    languageRows.value = langRows
    memberList.value = members
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载部件详情失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    if (seq === loadSeq) {
      loading.value = false
    }
  }
}

onMounted(load)

// slug 在配置弹窗中可被修改，地址变化后按新标识重取
watch(() => [route.params.slug, route.params.partSlug], () => {
  if (route.name === 'part-detail') load()
})

function openLanguage(row: LanguageProgressRow) {
  router.push({
    name: 'part-language',
    params: { slug: projectSlug.value, partSlug: partSlug.value, lang: toLangSegment(row.code) },
  })
}

// 部件配置弹窗由 PartEditModal 承载，这里只保存编辑目标
const editingPart = ref<Part | null>(null)

function openEdit() {
  editingPart.value = part.value
}

function onPartSaved(saved: Part) {
  // slug 可能被改，地址需跟上新标识；地址变化会触发上面的 watch 重取数据
  if (saved.slug !== partSlug.value) {
    router.replace({
      name: 'part-detail',
      params: { slug: projectSlug.value, partSlug: saved.slug },
    })
    return
  }
  load()
}

function onModalClosed() {
  editingPart.value = null
}

// 添加成员
const addVisible = ref(false)
const addForm = reactive<{ username: string; role: PartRole }>({ username: '', role: 'translator' })
const addSubmitting = ref(false)

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submitAddMember(): Promise<boolean> {
  if (!part.value) return false
  if (!addForm.username) {
    Message.error('用户名不能为空')
    return false
  }
  addSubmitting.value = true
  try {
    memberList.value = await addPartMember(part.value.id, { username: addForm.username, role: addForm.role })
    Message.success('成员已添加')
    addForm.username = ''
    addForm.role = 'translator'
    return true
  } catch (error) {
    console.error('添加部件成员失败:', error)
    Message.error(error instanceof Error ? error.message : '添加失败')
    return false
  } finally {
    addSubmitting.value = false
  }
}

async function confirmRemove(member: PartMember) {
  if (!part.value) return
  try {
    await removePartMember(part.value.id, member.username)
    memberList.value = memberList.value.filter((m) => m.username !== member.username)
    Message.success(`已移除 ${member.displayName}`)
  } catch (error) {
    console.error('移除部件成员失败:', error)
    Message.error(error instanceof Error ? error.message : '移除失败')
  }
}
</script>

<template>
  <div class="part-detail">
    <a-spin :loading="loading" class="part-detail__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
        </template>
      </a-result>

      <template v-else-if="part && project">
        <div class="part-detail__header">
          <div>
            <a-typography-title :heading="5" style="margin: 0">
              <router-link
                :to="{ name: 'project-detail', params: { slug: projectSlug } }"
                class="part-detail__project-link"
                >{{ project.name }}</router-link
              >
              <span class="part-detail__divider">/</span>
              {{ part.name }}
              <a-tag class="part-detail__namespace">{{ part.namespace }}</a-tag>
            </a-typography-title>
            <a-typography-text type="secondary">
              {{ part.repoUrl }}@{{ part.branch }}
            </a-typography-text>
          </div>
          <a-space>
            <a-button v-if="canManage" @click="openEdit">编辑配置</a-button>
          </a-space>
        </div>

        <a-tabs default-active-key="languages">
          <a-tab-pane key="languages" title="语言">
            <a-empty v-if="languageRows.length === 0" description="该部件还没有语言文件" />
            <LanguageProgress v-else :rows="languageRows" link @row-click="openLanguage" />
          </a-tab-pane>

          <a-tab-pane key="members" title="成员">
            <div v-if="canManage" class="part-detail__tab-actions">
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
                    {{ roleLabels[(record as PartMember).role] }}
                  </template>
                </a-table-column>
                <a-table-column v-if="canManage" title="操作" :width="120">
                  <template #cell="{ record }">
                    <a-popconfirm
                      content="确定移除该成员？"
                      @ok="confirmRemove(record as PartMember)"
                    >
                      <a-button type="text" status="danger" size="small">移除</a-button>
                    </a-popconfirm>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>

        <PartEditModal
          :part="editingPart"
          :project-file-mask="project.fileMask"
          :project-template-path="project.templatePath"
          @saved="onPartSaved"
          @closed="onModalClosed"
        />

        <a-modal v-model:visible="addVisible" title="添加部件成员" :ok-loading="addSubmitting" :on-before-ok="submitAddMember">
          <a-form :model="addForm" layout="vertical">
            <a-form-item label="用户名" required>
              <a-input v-model="addForm.username" placeholder="输入用户名" allow-clear />
            </a-form-item>
            <a-form-item label="角色">
              <a-select v-model="addForm.role">
                <a-option value="translator">译者</a-option>
                <a-option value="maintainer">维护者</a-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>
      </template>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.part-detail {
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

  &__project-link {
    color: rgb(var(--primary-6));
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__divider {
    margin: 0 8px;
    color: var(--color-text-3);
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
}
</style>
