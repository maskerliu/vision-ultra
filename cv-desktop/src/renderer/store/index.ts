import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { ConfigProviderTheme, ConfigProviderThemeVars, showNotify } from 'vant'
import { BizConfig, CommonApi, updateBaseDomain, updateClientUID } from '../../shared'
import { PushClient } from '../common'

let pushClient: PushClient

let GRAYS = ['#333333', '#646566', '#969799', '#c8c9cc', '#dcdee0', '#ebedf0', '#f2f3f5', '#f5f6f8']

export const CommonStore = defineStore('Common', {
  state: () => {
    return {
      inited: false,
      uid: '',
      theme: 'light' as ConfigProviderTheme,
      themeVars: {
        'dialogButtonHeight': '40px',
        'floatingBubbleSize': '2.5rem',
        'gridItemContentPadding': '8px',
        'popoverRadius': 'var(--van-radius-sm)',
        'switchSize': '1.2rem',
        'radioSize': '1rem',
        'checkboxSize': '1rem',
        'cellGroupInsetPadding': '5px',
        'cellGroupInsetTitlePadding': '5px 20px',
        'iconFontFamily': 'iconfont',
        'collapseItemContentPadding': '0px', // 5px
        'dialogBorderRadius': '6px',
        'tagFontSize': '0.6rem',
        'tagPadding': '2px 5px',
        'tagBorderRadius': '5px',
        'cellVerticalPadding': '8px',
        'cellHorizontalPadding': '15px',
        'popupRoundRadius': '8px',
        'popupCloseIconMargin': '23px',
        'borderWidth': '1px',
        'radiusMd': '5px',
        'dialogRadius': '8px',
        'floatingBubbleBackground': '#f04b1e',
      } as ConfigProviderThemeVars,
      fontSize: 9,
      lang: 'zh-CN',
      showDebugPanel: false,
      showApm: false,
      showFaceDbMgr: false,
      showSettings: false,
      registerUrl: '',
      bizConfig: {} as BizConfig
    }
  },
  actions: {
    async init(config?: BizConfig) {
      this.inited = false

      let wrapTheme = window.localStorage.getItem('theme')
      this.theme = wrapTheme != null ? wrapTheme as ConfigProviderTheme : 'light'
      this.updateTheme()

      let wrapLang = window.localStorage.getItem('lang')
      this.lang = wrapLang != null ? wrapLang : 'zh-CN'

      this.fontSize = parseInt(window.localStorage.getItem('fontSize') || '9')
      this.updateFontSize()

      pushClient = new PushClient()
      if (config) {
        updateBaseDomain(`${config.protocol}://${config.ip}:${config.port}`)
      } else {
        if (__DEV__) {
          updateBaseDomain(SERVER_BASE_URL)
        }
      }

      try {
        this.bizConfig = await CommonApi.getBizConfig()
        this.uid = window.localStorage.getItem('uid')
        if (this.uid == null) {
          this.uid = uuidv4().replaceAll('-', '')
          console.log(this.uid)
          window.localStorage.setItem('uid', this.uid)
        }

        this.bizConfig = config ? config : this.bizConfig
        updateClientUID(this.uid)

        this.registerUrl = `${this.bizConfig.protocol}://${this.bizConfig.ip}:${this.bizConfig.port}/appmock/register/${this.uid}`
        if (window.isWeb) {
          pushClient.start(`${this.bizConfig.protocol}://${this.bizConfig.ip}:${this.bizConfig.port}`, this.uid)
        } else {
          pushClient.start(`${this.bizConfig.protocol}://localhost:${this.bizConfig.port}`, this.uid)
        }
      } catch (err) {
        showNotify(err)
      }

      this.inited = true
    },
    sendMessage(params: CommonApi.PushMsg<any>) {
      pushClient.send(params)
    },
    publishMessage(message: string) {
      // here just mock a device to send a fake monitor data for test

    },
    updateLang() {
      window.localStorage.setItem('lang', this.lang)
    },
    updateTheme() {
      window.localStorage.setItem('theme', this.theme)
      window.mainApi?.setAppTheme(this.theme)

      let isDark = this.theme == 'dark'
      let grays = {}
      for (let i = 0; i < GRAYS.length; i++) {
        grays[`gray${i + 1}`] = isDark ? GRAYS[i] : GRAYS[7 - i]
      }
      this.themeVars = Object.assign(this.themeVars, grays)
    },
    updateFontSize() {
      window.localStorage.setItem('fontSize', `${this.fontSize}`)
      this.themeVars = Object.assign(this.themeVars, {
        'fontSizeXs': `${this.fontSize}px`,
        'fontSizeSm': `${this.fontSize + 2}px`,
        'fontSizeMd': `${this.fontSize + 4}px`,
        'fontSizeLg': `${this.fontSize + 6}px`,
      })
    },
    updateClientInfos(clientInfos: Array<CommonApi.ClientInfo>) {
      this.clientInfos = [...clientInfos]
    },
  }
})


export * from './AI'
export * from './Vision'

