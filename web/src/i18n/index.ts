import { computed } from 'vue'
import { defineStore } from 'pinia'
import { createI18n } from 'vue-i18n'
import { addI18nMessages, useLocale } from '@arco-design/web-vue/es/locale'
import arcoEnUS from '@arco-design/web-vue/es/locale/lang/en-us'
import arcoZhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'
import { messages, type LocaleCode } from '@/locale'

// 此处的界面语言（transcraft_locale）只决定界面文案，与顶栏的翻译工作语言（stores/ui.ts 的 transcraft_language）无关
const LOCALE_KEY = 'transcraft_locale'

/** 界面语言的语言代码之外的属性 */
interface LocaleMeta {
  /** 语言菜单中展示的名称，用该语言自身书写 */
  label: string
  /** BCP 47 标签，同时用于 html lang 与 Arco 组件内置文案的语言包代码 */
  bcp47: string
}

/** 界面语言选项，供语言菜单渲染 */
interface LocaleOption extends LocaleMeta {
  code: LocaleCode
}

// 语言包只有中英文两套，键必须与 src/locale 的语言包齐全对应，缺失时在此处编译报错
const localeTable: Record<LocaleCode, LocaleMeta> = {
  zh: { label: '简体中文', bcp47: 'zh-CN' },
  en: { label: 'English', bcp47: 'en-US' },
}

/** 界面语言列表，顺序即语言菜单的展示顺序 */
const locales: LocaleOption[] = (Object.keys(localeTable) as LocaleCode[]).map((code) => ({
  code,
  ...localeTable[code],
}))

// Arco 组件的内置文案（弹窗按钮、分页、日期选择器等）不走 vue-i18n，需要单独注册语言包后再切换
addI18nMessages({
  'zh-CN': arcoZhCN,
  'en-US': arcoEnUS,
})

// 界面语言记录来自 localStorage，属不可信输入；`in` 会命中原型链（constructor 之类），必须用 hasOwn
function storedLocale(): LocaleCode | null {
  const stored = localStorage.getItem(LOCALE_KEY)
  return stored !== null && Object.hasOwn(localeTable, stored) ? (stored as LocaleCode) : null
}

// 用户未选择过界面语言时，按浏览器给出的语言偏好顺序取第一个能匹配到的界面语言，都不匹配时用英文
function detectLocale(): LocaleCode {
  const stored = storedLocale()
  if (stored) {
    return stored
  }
  for (const tag of navigator.languages) {
    // 语言标签只取主语言子标签比对，zh-CN、zh-Hant-TW 都归到 zh
    const matched = locales.find((item) => item.code === tag.split('-')[0].toLowerCase())
    if (matched) {
      return matched.code
    }
  }
  return 'en'
}

const initialLocale = detectLocale()

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages,
})

function applyLocale(code: LocaleCode): void {
  const { bcp47 } = localeTable[code]
  i18n.global.locale.value = code
  document.documentElement.lang = bcp47
  useLocale(bcp47)
}

// 语言在模块加载时即生效，不能等到某个调用方记得同步，否则 html lang 与 Arco 文案会与界面语言脱节
applyLocale(initialLocale)

export const useLocaleStore = defineStore('locale', () => {
  // vue-i18n 的 locale 就是界面语言的状态，切换请走 setLocale：它会一并同步 html lang、Arco 文案与本地记录
  const locale = computed<LocaleCode>(() => i18n.global.locale.value)
  // 当前界面语言的完整选项，供界面展示当前语言名称
  const current = computed<LocaleOption>(() => ({ code: locale.value, ...localeTable[locale.value] }))

  /** 切换界面语言：同步语言包、html lang 与 Arco 组件文案，并记住用户的选择 */
  function setLocale(code: LocaleCode): void {
    applyLocale(code)
    localStorage.setItem(LOCALE_KEY, code)
  }

  return { locale, current, locales, setLocale }
})
