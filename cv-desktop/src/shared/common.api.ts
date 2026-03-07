import { Connection } from 'sockjs'
import { ApiPath } from "./api.const"
import { get, post } from './base.api'
import { BizConfig, ModelInfo } from './base.models'

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
    return get<BizConfig>(`${ApiPath.Common}${ApiPath.BizConfig}${ApiPath.Config_Get}`)
  }

  export function getAllPushClients() {
    return get<Array<MsgPushClient>>(`${ApiPath.Common}${ApiPath.PushClient}${ApiPath.Client_List}`)
  }

  export function getLocalModels() {
    return get<Array<ModelInfo>>(`${ApiPath.Common}${ApiPath.Model}${ApiPath.Model_List}`)
  }

  export function saveModelInfo(modelInfo: Partial<ModelInfo>) {
    return post(`${ApiPath.Common}${ApiPath.Model}${ApiPath.Model_Save}`, null, null, modelInfo)
  }

  export function deleteModel(modelId: string) {
    return post(`${ApiPath.Common}${ApiPath.Model}${ApiPath.Model_Delete}`, null, { modelId })
  }
}