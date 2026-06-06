import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp, watch } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import en from './assets/i18n/en.json'
import zh from './assets/i18n/zh.json'
import { useGameState } from './stores/useGameState.js'
import './css/global.css'
import './scss/global.scss'
import './scss/index.scss'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// 先创建并读取持久化的语言设置
const gameState = useGameState()

// 使用持久化语言初始化 i18n，避免初次渲染语言回退
const i18n = createI18n({
  legacy: false,
  locale: gameState.language,
  fallbackLocale: 'zh',
  messages: { zh, en },
})

app.use(i18n)

// 挂载前同步一次，确保初始渲染使用正确语言
i18n.global.locale.value = gameState.language

app.mount('#app')

// 监听 pinia 语言变化，动态切换 i18n 语言（立即执行以覆盖初始渲染）
watch(
  () => gameState.language,
  (lang) => {
    i18n.global.locale.value = lang
  },
  { immediate: true },
)
