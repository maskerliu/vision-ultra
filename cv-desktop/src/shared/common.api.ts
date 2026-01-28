import { Connection } from 'sockjs'
import { API_URL } from "./api.const"
import { get } from './base.api'
import { BizConfig } from './base.models'

export namespace CommonApi {
  export interface MsgPushClient extends ClientInfo {
    username: string
    conn?: Connection
  }

  export interface ClientInfo {
    connId: string
    uid: string
    ip: string
    port: number
    username?: string
  }

  export enum PushMsgType {
    TXT = 0,
    CMD = 1,
  }

  export enum CMDType {
    REGISTER = 0,
    KICKDOWN = 1,
    RECONNECT = 2,
    BROADCAST = 3
  }

  export enum BizType {
    IM = 0,
    Proxy = 1,
    ClientInfos = 2,
  }

  export interface PushMsg<T> {
    type: PushMsgType
    from?: string
    to?: string
    payload?: PushMsgPayload<T>
  }

  export interface PushMsgPayload<T> {
    type: BizType | CMDType
    content: T
  }

  export function getBizConfig() {
    return get<BizConfig>(`${API_URL.Common}${API_URL.GetBizConfig}`)
  }


  export function getAllPushClients() {
    return get<Array<MsgPushClient>>(`${API_URL.Common}${API_URL.GetAllPushClients}`)
  }
}