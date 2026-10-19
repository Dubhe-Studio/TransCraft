import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import ArcoVue from '@arco-design/web-vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/dist/arco.css'
import '@/styles/index.scss'
import App from './App.vue'
import { router } from './router'
import { i18n, useLocaleStore } from '@/i18n'
import { useUiStore } from './stores/ui'

const app = createApp(App)
const pinia = createPinia()
// 打开 debug：持久化读写失败（本地记录损坏、配额不足）会打到控制台，而不是被插件静默吞掉
pinia.use(createPersistedState({ debug: true }))
app.use(pinia)
// 首帧渲染前创建这两个 store：持久化的界面语言与主题选择在 store 创建时恢复，再由各自的 init 立即应用
useLocaleStore().initLocale()
useUiStore().initTheme()
app.use(router)
app.use(ArcoVue)
app.use(ArcoVueIcon)
app.use(i18n)
app.mount('#app')