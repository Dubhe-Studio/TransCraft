<script setup lang="ts">
// 部件 × 语言页：展示该语言的完成情况与成员角色，并作为进入翻译工作台的入口
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { projectDetail } from '../api/project'
import {
  addLanguageMember,
  languageMembers,
  partDetailBySlug,
  partLanguageProgressBySlug,
  removeLanguageMember,
} from '../api/part'
import { fromLangSegment, toLangSegment } from '../langSegment'
import { formatNumber } from '../format'
import { useLocaleStore } from '@/i18n'
import type {
  LanguageMember,
  LanguageProgress,
  LanguageRole,
  PartDetail,
  ProjectDetail,
} from '../api/types'

const { t } = useI18n()
const localeStore = useLocaleStore()

const route = useRoute()
const router = useRouter()

// 三级地址寻址：项目 slug、部件 slug、语言段（zh-CN 形式），始终从地址实时取
const projectSlug = computed(() => String(route.params.slug))
const partSlug = computed(() => String(route.params.partSlug))
const language = computed(() => fromLangSegment(String(route.params.lang)))

const project = ref<ProjectDetail | null>(null)
const part = ref<PartDetail | null>(null)
const progress = ref<LanguageProgress | null>(null)
const memberList = ref<LanguageMember[]>([])
const loading = ref(true)
const loadError = ref('')

// 项目所有者/维护者可配置语言成员
const canManage = computed(() => project.value?.role === 'owner' || project.value?.role === 'maintainer')

function roleLabel(role: LanguageRole): string {
  return t(`member.role.${role}`)
}

// 地址变化触发重取（路由组件复用、前进后退）时旧请求不得覆盖新数据
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    const [projectData, partData, langRows] = await Promise.all([
      projectDetail(projectSlug.value),
      partDetailBySlug(projectSlug.value, partSlug.value),
      partLanguageProgressBySlug(projectSlug.value, partSlug.value),
    ])
    if (seq !== loadSeq) return
    const row = langRows.find((item) => item.code === language.value)
    if (!row) {
      loadError.value = t('part_language.not_found')
      loading.value = false
      return
    }
    const members = await languageMembers(partData.id, language.value)
    if (seq !== loadSeq) return
    project.value = projectData
    part.value = partData
    progress.value = row
    memberList.value = members
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载语言进度失败:', error)
    loadError.value = error instanceof Error ? error.message : t('part_language.load_failed')
  } finally {
    if (seq === loadSeq) {
      loading.value = false
    }
  }
}

onMounted(load)

// 地址任一段变化（含浏览器前进后退）后按新寻址重取
watch(() => [route.params.slug, route.params.partSlug, route.params.lang], () => {
  if (route.name === 'part-language') load()
})

function openTranslate() {
  router.push({
    name: 'part-translate',
    params: { slug: projectSlug.value, partSlug: partSlug.value, lang: toLangSegment(language.value) },
  })
}

// 添加成员
const addVisible = ref(false)
const addForm = reactive<{ username: string; role: LanguageRole }>({ username: '', role: 'translator' })
const addSubmitting = ref(false)

// 返回是否允许关闭弹窗，校验失败或提交失败时保持弹窗打开
async function submitAddMember(): Promise<boolean> {
  if (!part.value) return false
  if (!addForm.username) {
    Message.error(t('member.username_required'))
    return false
  }
  addSubmitting.value = true
  try {
    memberList.value = await addLanguageMember(part.value.id, language.value, { username: addForm.username, role: addForm.role })
    Message.success(t('member.added'))
    addForm.username = ''
    addForm.role = 'translator'
    return true
  } catch (error) {
    console.error('添加语言成员失败:', error)
    Message.error(error instanceof Error ? error.message : t('member.add_failed'))
    return false
  } finally {
    addSubmitting.value = false
  }
}

async function confirmRemove(member: LanguageMember) {
  if (!part.value) return
  try {
    await removeLanguageMember(part.value.id, language.value, member.username)
    memberList.value = memberList.value.filter((m) => m.username !== member.username)
    Message.success(t('member.removed', { name: member.displayName }))
  } catch (error) {
    console.error('移除语言成员失败:', error)
    Message.error(error instanceof Error ? error.message : t('member.remove_failed'))
  }
}
</script>

<template>
  <div class="part-language">
    <a-spin :loading="loading" class="part-language__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">{{ $t('common.retry') }}</a-button>
        </template>
      </a-result>

      <template v-else-if="part && project && progress">
        <div class="part-language__header">
          <div>
            <a-typography-title :heading="5" style="margin: 0">
              <router-link
                :to="{ name: 'part-detail', params: { slug: projectSlug, partSlug } }"
                class="part-language__part-link"
              >
                {{ part.name }}
              </router-link>
              <span class="part-language__divider">/</span>
              {{ progress.name }}
            </a-typography-title>
            <a-typography-text type="secondary">
              {{ project.name }} · {{ toLangSegment(progress.code) }}
            </a-typography-text>
          </div>
          <a-button type="primary" @click="openTranslate">
            {{ $t('part_language.enter_translate') }}
          </a-button>
        </div>

        <a-card class="part-language__progress" :bordered="true">
          <div class="part-language__progress-head">
            <a-typography-title :heading="6" style="margin: 0">{{ $t('part_language.progress_title') }}</a-typography-title>
            <span class="part-language__percent">{{ progress.translatedPercent }}%</span>
          </div>
          <a-progress
            :percent="progress.translatedPercent / 100"
            :show-text="false"
            color="rgb(var(--primary-6))"
            track-color="var(--color-fill-2)"
          />
          <a-typography-text type="secondary">
            {{ $t('language_progress.summary', {
              unfinished: formatNumber(progress.untranslatedStrings, localeStore.current.bcp47),
              total: formatNumber(progress.totalStrings, localeStore.current.bcp47),
            }) }}
          </a-typography-text>
        </a-card>

        <a-typography-title :heading="6" class="part-language__group-title">{{ $t('part_language.language_members') }}</a-typography-title>
        <div v-if="canManage" class="part-language__tab-actions">
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
                {{ roleLabel((record as LanguageMember).role) }}
              </template>
            </a-table-column>
            <a-table-column v-if="canManage" :title="$t('member.col_action')" :width="120">
              <template #cell="{ record }">
                <a-popconfirm
                  :content="$t('member.remove_confirm')"
                  @ok="confirmRemove(record as LanguageMember)"
                >
                  <a-button type="text" status="danger" size="small">{{ $t('member.remove') }}</a-button>
                </a-popconfirm>
              </template>
            </a-table-column>
          </template>
        </a-table>

        <a-modal v-model:visible="addVisible" :title="$t('member.add_language_title')" :ok-loading="addSubmitting" :on-before-ok="submitAddMember">
          <a-form :model="addForm" layout="vertical">
            <a-form-item :label="$t('member.col_username')" required>
              <a-input v-model="addForm.username" :placeholder="$t('member.username_placeholder')" allow-clear />
            </a-form-item>
            <a-form-item :label="$t('member.col_role')">
              <a-select v-model="addForm.role">
                <a-option value="translator">{{ $t('member.role.translator') }}</a-option>
                <a-option value="proofreader">{{ $t('member.role.proofreader') }}</a-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>
      </template>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.part-language {
  &__spin {
    width: 100%;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__part-link {
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

  &__progress {
    margin-bottom: 16px;
  }

  &__progress-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__percent {
    color: rgb(var(--success-6));
    font-size: 18px;
    font-weight: 600;
  }

  &__group-title {
    margin: 8px 0 12px;
  }

  &__tab-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-bottom: 12px;
  }
}
</style>
