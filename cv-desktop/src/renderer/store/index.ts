import { defineStore } from 'pinia'
import { showNotify } from 'vant'
import { BizConfig, CommonApi, updateBaseDomain, updateClientUID } from '../../common'
import { generateUid, PushClient } from '../common'


let pushClient: PushClient

export const CommonStore = defineStore('Common', {
  state: () => {
    return {
      uid: '',
      showApm: true,
      registerUrl: '',
      bizConfig: {} as BizConfig
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
    async init(config?: BizConfig) {
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
          this.uid = generateUid()
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
    },
    sendMessage(params: CommonApi.PushMsg<any>) {
      pushClient.send(params)
    },
    publishMessage(message: string) {
      // here just mock a device to send a fake monitor data for test

    },
    updateClientInfos(clientInfos: Array<CommonApi.ClientInfo>) {
      this.clientInfos = [...clientInfos]
    },
  }
})


export * from './Vision'

