import SockJS from 'sockjs-client'
import { showNotify } from 'vant'
import { CommonApi } from '../../common'
import { CommonStore } from '../store'

export class PushClient {
  private uid: string
  private sockjs: WebSocket

  private commonStore: any

  constructor() {
    this.commonStore = CommonStore()
  }

  public start(host: string, uid: string): void {
    this.uid = uid
    try {
      this.sockjs.close()
    } catch (err) { }
    this.sockjs = new SockJS(`${host}/echo`, { transports: 'websocket' })
    this.sockjs.onopen = () => { this.register(uid) }
    this.sockjs.onmessage = (e: any) => { this.handleMsg(e.data) }
  }

  public send(data: CommonApi.PushMsg<any>): void {
    data.from = this.uid
    this.sockjs.send(JSON.stringify(data))
  }

  private register(uid: string): void {
    let msg: CommonApi.PushMsg<any> = {
      type: CommonApi.PushMsgType.CMD,
      payload: {
        type: CommonApi.CMDType.REGISTER,
        content: { uid: uid, username: localStorage.username }
      }
    }
    this.send(msg)
  }

  private handleMsg(data: any): void {
    let msg: CommonApi.PushMsg<any> = JSON.parse(data)
    switch (msg.type) {
      case CommonApi.PushMsgType.CMD: {
        this.handleCMD(msg.payload)
        break
      }
      case CommonApi.PushMsgType.TXT: {
        this.handlePayload(msg.payload)
        break
      }
      default:
        showNotify({ message: 'unhandled code:' + msg.type, type: 'warning' })
    }
  }

  private handleCMD(msg: CommonApi.PushMsgPayload<any>) {
    switch (msg.type) {
      case CommonApi.CMDType.REGISTER:
        this.commonStore.updateShowQrCode(false)
        showNotify({ message: '设备[' + msg.content + ']注册成功', type: 'success', duration: 500 })
        break
      case CommonApi.CMDType.KICKDOWN:
        showNotify({ message: '被踢下线', type: 'danger', duration: 1200 })
        window.close()
        break
    }
  }

  private handlePayload(msg: CommonApi.PushMsgPayload<any>) {
    switch (msg.type) {
      case CommonApi.BizType.Proxy: {
        // this.proxyRecordStore.updateRecord(msg.content)
        break
      }
      case CommonApi.BizType.IM: {
        showNotify({ message: msg.content, type: 'success', duration: 500 })
        break
      }
      case CommonApi.BizType.ClientInfos: {
        this.commonStore.updateClientInfos(msg.content)
        break
      }
    }
  }
}
