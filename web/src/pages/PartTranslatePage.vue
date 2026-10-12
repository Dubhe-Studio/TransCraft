<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { partDetail, partEntries, saveTranslation } from '../api/part'
import type { PartDetail, TranslationEntry } from '../api/types'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const ui = useUiStore()

const partId = Number(route.params.id)

const part = ref<PartDetail | null>(null)
const entries = ref<TranslationEntry[]>([])
const loading = ref(true)
const loadError = ref('')

type FilterMode = 'all' | 'untranslated' | 'translated'
const filterMode = ref<FilterMode>('all')
const keyword = ref('')

const filteredEntries = computed(() => {
  return entries.value.filter((entry) => {
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

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [partInfo, list] = await Promise.all([
      partDetail(partId),
      partEntries(partId, ui.currentLanguage),
    ])
    part.value = partInfo
    entries.value = list
    selectedKey.value = list[0]?.key ?? ''
    draft.value = list[0]?.target ?? ''
  } catch (error) {
    console.error('加载翻译条目失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

// 条目译文跟随当前工作语言变化
watch(() => ui.currentLanguage, load)

onMounted(load)

function selectEntry(entry: TranslationEntry) {
  selectedKey.value = entry.key
  draft.value = entry.target
}

async function save() {
  if (!selected.value) return
  saving.value = true
  try {
    await saveTranslation(partId, ui.currentLanguage, selected.value.key, draft.value)
    selected.value.target = draft.value
    Message.success('译文已保存')
  } catch (error) {
    console.error('保存译文失败:', error)
    Message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
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
          <a-typography-title :heading="5" style="margin: 0">
            {{ part.projectName }} / {{ part.name }}
          </a-typography-title>
          <a-typography-text type="secondary">{{ part.namespace }}</a-typography-text>
        </div>

        <div class="translate__body">
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
            <div
              v-for="entry in filteredEntries"
              :key="entry.key"
              class="translate__entry"
              :class="{ 'translate__entry--active': entry.key === selectedKey }"
              @click="selectEntry(entry)"
            >
              <div class="translate__entry-key">{{ entry.key }}</div>
              <div class="translate__entry-text">{{ entry.target || entry.source }}</div>
              <icon-check-circle-fill v-if="entry.target" class="translate__entry-done" />
            </div>
          </div>

          <div v-if="selected" class="translate__editor">
            <a-typography-text class="translate__key" code>{{ selected.key }}</a-typography-text>
            <div class="translate__field">
              <div class="translate__field-label">参考原文（{{ part.projectName }} 参考语言）</div>
              <div class="translate__source">{{ selected.source }}</div>
            </div>
            <div class="translate__field">
              <div class="translate__field-label">译文（{{ ui.currentLanguage }}）</div>
              <a-textarea
                v-model="draft"
                :auto-size="{ minRows: 4 }"
                placeholder="输入译文"
              />
            </div>
            <a-button type="primary" :loading="saving" @click="save">保存译文</a-button>
          </div>
          <a-empty v-else description="从左侧选择一条要翻译的条目" />
        </div>
      </template>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.translate {
  &__spin {
    width: 100%;
  }

  &__header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__body {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 24px;
    align-items: start;
  }

  &__list {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg-2);
    max-height: 70vh;
    overflow-y: auto;
  }

  &__toolbar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    background-color: var(--color-bg-2);
    z-index: 1;
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
    color: rgb(var(--success-6));
  }

  &__editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__field-label {
    color: var(--color-text-2);
    font-size: 13px;
    margin-bottom: 6px;
  }

  &__source {
    padding: 10px 12px;
    border-radius: 4px;
    background-color: var(--color-fill-2);
    color: var(--color-text-1);
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
