<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import {
  approveEntry,
  partDetailBySlug,
  partEntries,
  partLanguageProgress,
  saveSuggestion,
  saveTranslation,
} from '../api/part'
import { fromLangSegment, toLangSegment } from '../langSegment'
import type { LanguageProgress as LanguageProgressRow, PartDetail, TranslationEntry } from '../api/types'
import LanguageProgress from '../components/LanguageProgress.vue'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()

// 部件以地址中的 项目 slug + 部件 slug 定位，翻译语言由地址中的语言段决定；同一路由组件复用时从地址实时取
const projectSlug = computed(() => String(route.params.slug))
const partSlug = computed(() => String(route.params.partSlug))
const language = ref(fromLangSegment(String(route.params.lang)))
const partId = ref(0)

const part = ref<PartDetail | null>(null)
const entries = ref<TranslationEntry[]>([])
// 部件已有的语言列表，即语言选择器的可选范围，附带完成度用于提示哪些语言待翻译
const languageRows = ref<LanguageProgressRow[]>([])
const loading = ref(true)
const loadError = ref('')

type FilterMode = 'all' | 'untranslated' | 'translated'
const filterMode = ref<FilterMode>('all')
const keyword = ref('')

// 未翻译条目靠前，组内保持接口返回顺序
const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => Number(!a.target) * -1 + Number(!b.target))
})

const filteredEntries = computed(() => {
  return sortedEntries.value.filter((entry) => {
    if (filterMode.value === 'untranslated' && entry.target) return false
    if (filterMode.value === 'translated' && !entry.target) return false
    if (!keyword.value) return true
    const text = keyword.value.toLowerCase()
    return entry.key.toLowerCase().includes(text)
      || entry.source.toLowerCase().includes(text)
      || entry.target.toLowerCase().includes(text)
  })
})

const selectedKey = ref('')
const selected = computed(() => entries.value.find((e) => e.key === selectedKey.value) ?? null)
const draft = ref('')
const saving = ref(false)
const approving = ref(false)

const suggestVisible = ref(false)
const suggestText = ref('')
const suggesting = ref(false)

const primaryLanguage = computed(() => auth.user?.primaryLanguage ?? '')

// 地址中的语言可能不在部件已有语言列表中，补一个仅含代码的选项保证选择器正常显示
const languageOptions = computed<LanguageProgressRow[]>(() => {
  const rows = languageRows.value
  if (language.value && !rows.some((r) => r.code === language.value)) {
    return [
      ...rows,
      { code: language.value, name: language.value, translatedPercent: 0, untranslatedStrings: 0, totalStrings: 0 },
    ]
  }
  return rows
})

// 语言或部件快速切换时旧请求不得覆盖新数据
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    // 条目与语言接口按部件 id 调用，先由地址中的 slug 解析出 id；解析与取数共用一个序号，快速切换部件时不得出现详情与条目错配
    const partInfo = await partDetailBySlug(projectSlug.value, partSlug.value)
    if (seq !== loadSeq) return
    partId.value = partInfo.id
    const [list, langRows] = await Promise.all([
      partEntries(partInfo.id, language.value),
      partLanguageProgress(partInfo.id),
    ])
    if (seq !== loadSeq) return
    part.value = partInfo
    entries.value = list
    languageRows.value = langRows
    // 默认选中第一条未翻译条目，与列表的未翻译靠前排序保持一致
    const first = list.find((e) => !e.target) ?? list[0]
    selectedKey.value = first?.key ?? ''
    draft.value = first?.target ?? ''
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载翻译条目失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    if (seq === loadSeq) {
      loading.value = false
    }
  }
}

// 切换条目或语言前，当前译文若未保存需经用户确认丢弃
function confirmDiscardDraft(next: () => void) {
  if (selected.value && draft.value !== selected.value.target) {
    Modal.confirm({
      title: '未保存的修改',
      content: '当前译文尚未保存，切换后将丢失。确定继续吗？',
      onOk: next,
    })
    return
  }
  next()
}

// 页内选择器切换语言即切换地址，地址变化驱动条目重载
// Arco change 事件的值类型含多选数组形态，此处统一按单值取字符串
function changeLanguage(value: string | number | boolean | Record<string, unknown> | (string | number | boolean | Record<string, unknown>)[]) {
  const code = String(value)
  if (code === language.value) return
  confirmDiscardDraft(() => {
    router.push({
      name: 'part-translate',
      params: { slug: projectSlug.value, partSlug: partSlug.value, lang: toLangSegment(code) },
    })
  })
}

// 地址语言段变化（页内切换或浏览器前进后退）时同步工作语言并重载
watch(() => route.params.lang, (lang) => {
  if (route.name !== 'part-translate' || !lang) return
  const code = fromLangSegment(String(lang))
  if (code === language.value && partId.value) return
  language.value = code
  ui.setCurrentLanguage(code)
  load()
})

// 部件地址段变化（前进后退切到另一部件）时重载
watch(() => [route.params.slug, route.params.partSlug], () => {
  if (route.name !== 'part-translate') return
  load()
})

// 顶栏语言菜单写全局 store，这里把变化折回页内切换链路，保持工作语言只由地址决定
watch(() => ui.currentLanguage, (code) => {
  if (route.name !== 'part-translate' || code === language.value) return
  changeLanguage(code)
})

onMounted(() => {
  // 顶栏语言展示跟随本页语言，首次进入直接同步无需确认（草稿尚为空）
  ui.setCurrentLanguage(language.value)
  load()
})

function selectEntry(entry: TranslationEntry) {
  confirmDiscardDraft(() => {
    selectedKey.value = entry.key
    draft.value = entry.target
  })
}

// 从当前条目之后开始找第一个未翻译条目，找不到则绕回列表开头再找一遍；限定在当前筛选结果内，避免跳到被隐藏的条目
function nextUntranslated(): TranslationEntry | null {
  const list = filteredEntries.value
  const index = list.findIndex((e) => e.key === selectedKey.value)
  for (let offset = 1; offset < list.length; offset += 1) {
    const entry = list[(index + offset) % list.length]
    if (!entry.target) return entry
  }
  return null
}

function moveTo(entry: TranslationEntry) {
  selectedKey.value = entry.key
  draft.value = entry.target
}

function moveToNextUntranslated() {
  const next = nextUntranslated()
  if (next) {
    moveTo(next)
  } else {
    Message.info('没有更多未翻译条目了')
  }
}

// 返回是否保存成功，供"保存并继续"决定要不要移动选中项
async function persistDraft(): Promise<boolean> {
  // 先捕获当前条目引用，await 期间用户切换条目也不会写错目标
  const entry = selected.value
  if (!entry) return false
  const text = draft.value
  saving.value = true
  try {
    await saveTranslation(partId.value, language.value, entry.key, text)
    entry.target = text
    // 译文被修改后原批准结论不再成立
    entry.approved = false
    // 完成情况按已存译文实时计算，保存后同步刷新
    languageRows.value = await partLanguageProgress(partId.value)
    return true
  } catch (error) {
    console.error('保存译文失败:', error)
    Message.error(error instanceof Error ? error.message : '保存失败')
    return false
  } finally {
    saving.value = false
  }
}

async function saveAndStay() {
  if (await persistDraft()) {
    Message.success('译文已保存')
  }
}

async function saveAndNext() {
  if (await persistDraft()) {
    Message.success('译文已保存')
    moveToNextUntranslated()
  }
}

async function approve() {
  const entry = selected.value
  if (!entry) return
  approving.value = true
  try {
    await approveEntry(partId.value, language.value, entry.key)
    entry.approved = true
    Message.success('已批准')
  } catch (error) {
    console.error('批准译文失败:', error)
    Message.error(error instanceof Error ? error.message : '批准失败')
  } finally {
    approving.value = false
  }
}

function openSuggest() {
  suggestText.value = draft.value
  suggestVisible.value = true
}

async function submitSuggestion(): Promise<boolean> {
  const entry = selected.value
  if (!entry) return false
  if (!suggestText.value.trim()) {
    Message.error('建议内容不能为空')
    return false
  }
  suggesting.value = true
  try {
    await saveSuggestion(partId.value, language.value, entry.key, suggestText.value.trim())
    Message.success('建议已提交')
    return true
  } catch (error) {
    console.error('提交建议失败:', error)
    Message.error(error instanceof Error ? error.message : '提交失败')
    return false
  } finally {
    suggesting.value = false
  }
}
</script>

<template>
  <div class="translate">
    <a-spin :loading="loading" class="translate__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
        </template>
      </a-result>

      <template v-else-if="part">
        <div class="translate__header">
          <div>
            <a-typography-title :heading="5" style="margin: 0">
              <router-link
                :to="{ name: 'part-language', params: { slug: projectSlug, partSlug, lang: toLangSegment(language) } }"
                class="translate__part-link"
              >
                {{ part.projectName }} / {{ part.name }}
              </router-link>
            </a-typography-title>
            <a-typography-text type="secondary">{{ part.namespace }}</a-typography-text>
          </div>
          <a-space>
            <a-select
              :model-value="language"
              class="translate__lang-select"
              @change="changeLanguage"
            >
              <a-option v-for="row in languageOptions" :key="row.code" :value="row.code">
                <div class="translate__lang-option">
                  <span>{{ row.name }}</span>
                  <span class="translate__lang-percent">{{ row.translatedPercent }}%</span>
                </div>
              </a-option>
            </a-select>
            <a-popover title="各语言完成情况" position="br" :content-style="{ width: '360px' }">
              <a-button>完成情况</a-button>
              <template #content>
                <LanguageProgress :rows="languageRows" />
              </template>
            </a-popover>
          </a-space>
        </div>

        <div v-if="selected" class="translate__panel">
          <div class="translate__key-row">
            <a-typography-text class="translate__key" code>{{ selected.key }}</a-typography-text>
            <a-tag v-if="selected.approved" color="green" size="small">已批准</a-tag>
          </div>
          <div class="translate__field">
            <div class="translate__field-label">模板语言（{{ part.referenceLanguage }}）</div>
            <div class="translate__block">{{ selected.source }}</div>
          </div>
          <div class="translate__field">
            <div class="translate__field-label">第一语言（{{ primaryLanguage }}）</div>
            <div class="translate__block" :class="{ 'translate__block--empty': !selected.primary }">
              {{ selected.primary || '暂无第一语言译文' }}
            </div>
          </div>
          <div class="translate__field">
            <div class="translate__field-label">当前译文（{{ language }}）</div>
            <a-textarea
              v-model="draft"
              :auto-size="{ minRows: 3 }"
              placeholder="输入译文"
            />
          </div>
          <div class="translate__actions">
            <a-button type="primary" :loading="saving" @click="saveAndNext">保存并继续</a-button>
            <a-button :loading="saving" @click="saveAndStay">保存并停留</a-button>
            <a-button
              v-if="part.canApprove"
              status="success"
              :loading="approving"
              :disabled="selected.approved"
              @click="approve"
            >
              批准
            </a-button>
            <a-button @click="openSuggest">建议</a-button>
            <a-button @click="confirmDiscardDraft(moveToNextUntranslated)">跳过</a-button>
          </div>
        </div>
        <a-empty v-else description="从下方列表选择一条要翻译的条目" />

        <div class="translate__list">
          <div class="translate__toolbar">
            <a-radio-group v-model="filterMode" type="button" size="small">
              <a-radio value="all">全部</a-radio>
              <a-radio value="untranslated">未翻译</a-radio>
              <a-radio value="translated">已翻译</a-radio>
            </a-radio-group>
            <a-input-search v-model="keyword" size="small" placeholder="搜索键名或内容" allow-clear />
          </div>

          <a-empty v-if="filteredEntries.length === 0" description="没有符合条件的条目" />
          <a-scrollbar v-else class="translate__scroll">
            <div
              v-for="entry in filteredEntries"
              :key="entry.key"
              class="translate__entry"
              :class="{ 'translate__entry--active': entry.key === selectedKey }"
              @click="selectEntry(entry)"
            >
              <div class="translate__entry-key">{{ entry.key }}</div>
              <div class="translate__entry-text">{{ entry.target || entry.source }}</div>
              <icon-check-circle-fill v-if="entry.approved" class="translate__entry-approved" />
              <icon-check-circle-fill v-else-if="entry.target" class="translate__entry-done" />
            </div>
          </a-scrollbar>
        </div>
      </template>
    </a-spin>

    <a-modal
      v-model:visible="suggestVisible"
      title="提交建议"
      :ok-loading="suggesting"
      :on-before-ok="submitSuggestion"
    >
      <a-typography-text type="secondary">
        建议不会直接成为译文，交由有批准权限的成员处理。
      </a-typography-text>
      <a-textarea v-model="suggestText" :auto-size="{ minRows: 3 }" placeholder="输入建议内容" />
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.translate {
  &__spin {
    width: 100%;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__part-link {
    color: var(--color-text-1);
    text-decoration: none;

    &:hover {
      color: rgb(var(--primary-6));
    }
  }

  &__lang-select {
    width: 240px;
  }

  &__lang-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__lang-percent {
    color: rgb(var(--success-6));
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  &__key-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__field-label {
    color: var(--color-text-2);
    font-size: 13px;
    margin-bottom: 6px;
  }

  &__block {
    padding: 10px 12px;
    border-radius: 4px;
    background-color: var(--color-fill-2);
    color: var(--color-text-1);
    white-space: pre-wrap;
    word-break: break-word;

    &--empty {
      color: var(--color-text-3);
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__list {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg-2);
  }

  &__scroll {
    max-height: 40vh;
  }

  &__toolbar {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  &__entry {
    position: relative;
    padding: 8px 32px 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--color-border);

    &:hover {
      background-color: var(--color-fill-1);
    }

    &--active {
      background-color: var(--color-fill-2);
    }
  }

  &__entry-key {
    font-size: 12px;
    color: var(--color-text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__entry-text {
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__entry-done {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: rgb(var(--primary-6));
  }

  &__entry-approved {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: rgb(var(--success-6));
  }
}
</style>
