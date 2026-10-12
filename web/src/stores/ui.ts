import { ref } from 'vue'
import { defineStore } from 'pinia'

const LANGUAGE_KEY = 'transcraft_language'
const THEME_KEY = 'transcraft_theme'

export type ThemeMode = 'light' | 'dark'

function storedTheme(): ThemeMode | null {
  const value = localStorage.getItem(THEME_KEY)
  return value === 'dark' || value === 'light' ? value : null
}

function applyTheme(mode: ThemeMode): void {
  // Arco 通过 body 上的 arco-theme 属性切换整套 CSS 变量到深色配色
  if (mode === 'dark') {
    document.body.setAttribute('arco-theme', 'dark')
  } else {
    document.body.removeAttribute('arco-theme')
  }
}

export const useUiStore = defineStore('ui', () => {
  // 顶栏语言菜单选中的当前工作语言，跨页面保持
  const currentLanguage = ref(localStorage.getItem(LANGUAGE_KEY) ?? '')
  // 用户手动切换过则以本地记录为准，否则跟随系统深浅色（initTheme 时读取）
  const theme = ref<ThemeMode>(storedTheme() ?? 'light')

  function setCurrentLanguage(code: string): void {
    currentLanguage.value = code
    localStorage.setItem(LANGUAGE_KEY, code)
  }

  // 首帧渲染前由 main.ts 调用一次：确定主题并建立系统主题监听
  function initTheme(): void {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
    if (!storedTheme()) {
      theme.value = systemDark.matches ? 'dark' : 'light'
    }
    // 用户未手动选择主题时，系统切换深浅色应即时生效
    systemDark.addEventListener('change', (event) => {
      if (storedTheme()) {
        return
      }
      theme.value = event.matches ? 'dark' : 'light'
      applyTheme(theme.value)
    })
    applyTheme(theme.value)
  }

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, theme.value)
    applyTheme(theme.value)
  }

  return { currentLanguage, setCurrentLanguage, theme, initTheme, toggleTheme }
})
