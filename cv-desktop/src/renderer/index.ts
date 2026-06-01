import '@vant/touch-emulator'
import { createPinia } from 'pinia'
import vant from 'vant'
import { createApp } from 'vue'
import i18n from '../lang'
import App from './App.vue'
import router from './router'
require('vant/lib/index.css')

// import TDesign from 'tdesign-vue-next'
// import 'tdesign-vue-next/es/style/index.css'

// import TDesignChat from '@tdesign-vue-next/chat'
// import '@tdesign-vue-next/chat/es/style/index.css'

import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
require('overlayscrollbars/overlayscrollbars.css')

OverlayScrollbars.plugin(ClickScrollPlugin)

const pinia = createPinia()
const app = createApp(App)

// app.config.compilerOptions.isCustomElement = tag => {
//   console.log(tag)
//   return !tag.startsWith('media-')
// }

app.use(i18n)
app.use(router)
app.use(pinia)
app.use(vant)
// app.use(TDesign)
// app.use(TDesignChat)
app.mount('#app')