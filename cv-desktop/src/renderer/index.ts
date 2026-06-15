import '@vant/touch-emulator'
import { createPinia } from 'pinia'
import vant from 'vant'
import { createApp } from 'vue'
import i18n from '../lang'
import App from './App.vue'
import router from './router'
require('vant/lib/index.css')


import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
require('overlayscrollbars/overlayscrollbars.css')

OverlayScrollbars.plugin(ClickScrollPlugin)

const pinia = createPinia()
const app = createApp(App)

app.use(i18n)
app.use(router)
app.use(pinia)
app.use(vant)
// app.use(TDesign)
// app.use(TDesignChat)
app.mount('#app')