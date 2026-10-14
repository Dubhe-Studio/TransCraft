import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/dist/arco.css'
import '@/styles/index.scss'
import App from './App.vue'
import { router } from './router'
import { i18n } from '@/i18n'
import { useUiStore } from './stores/ui'

const app = createApp(App)
app.use(createPinia())
// 首帧渲染前应用主题，避免深浅色闪烁
useUiStore().initTheme()
app.use(router)
app.use(ArcoVue)
app.use(ArcoVueIcon)
app.use(i18n)
app.mount('#app')
