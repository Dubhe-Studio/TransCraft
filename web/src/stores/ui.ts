import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'
/** 'system' 表示跟随操作系统深浅色，其余为用户手动选择的主题 */
type ThemeChoice = 'system' | ThemeMode

const STORAGE_KEY = 'transcraft_ui'

// 本地记录属不可信输入，只接受约定的取值，其余（含 constructor 这类原型链属性名）一律视为跟随系统
function pickThemeChoice(value: unknown): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function applyTheme(mode: ThemeMode): void {
  // Arco 通过 body 上的 arco-theme 属性切换整套 CSS 变量到深色配色
  if (mode === 'dark') {
    document.body.setAttribute('arco-theme', 'dark')
  } else {
    document.body.removeAttribute('arco-theme')
  }
}

export const useUiStore = defineStore(
  'ui',
  () => {
    // 顶栏语言菜单选中的当前工作语言，跨页面保持
    const currentLanguage = ref('')
    // 主题的持久化状态：'system' 时跟随系统，手动切换后固定为用户的选择
    const themeChoice = ref<ThemeChoice>('system')
    // 操作系统的深浅色偏好，由 initTheme 建立监听；只在跟随系统时参与 theme 的计算
    const systemDark = ref(false)

    const theme = computed<ThemeMode>(() =>
      themeChoice.value === 'system' ? (systemDark.value ? 'dark' : 'light') : themeChoice.value,
    )

    function setCurrentLanguage(code: string): void {
      currentLanguage.value = code
    }

    // 首帧渲染前由 main.ts 调用一次：应用主题并建立系统主题监听
    function initTheme(): void {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = systemTheme.matches
      applyTheme(theme.value)
      // 用户未手动选择主题时，系统切换深浅色应即时生效
      systemTheme.addEventListener('change', (event) => {
        systemDark.value = event.matches
        if (themeChoice.value === 'system') {
          applyTheme(theme.value)
        }
      })
    }

    function toggleTheme(): void {
      themeChoice.value = theme.value === 'dark' ? 'light' : 'dark'
      applyTheme(theme.value)
    }

    return { currentLanguage, themeChoice, theme, setCurrentLanguage, initTheme, toggleTheme }
  },
  {
    persist: {
      key: STORAGE_KEY,
      pick: ['currentLanguage', 'themeChoice'],
      // 从本地恢复的取值同样不可信：只接受字符串与约定主题，非法值回落为默认
      afterHydrate: ({ store }) => {
        store.currentLanguage = typeof store.currentLanguage === 'string' ? store.currentLanguage : ''
        store.themeChoice = pickThemeChoice(store.themeChoice)
      },
    },
  },
)
