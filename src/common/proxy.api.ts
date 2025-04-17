import { get, post } from './base.api'

import { CommonApi } from './common.api'

export namespace ProxyMock {

  export type ProxyConfig = {
    dataServer: string, // 数据代理服务器，可以指向开发自己的
    status: boolean,
    delay: number
  }

  export interface StatisticRecord {
    app_id: string
    app_version: string
    os: string
    rule: string
    pageId: string
    elementId: string
    event_id: number
    arg1: string
    arg2: string
    arg3: string
    args: string
    desc: string
  }

  export interface ProxyRequestRecord {
    id: number
    type: number
    // _idx?: string // 列表索引
    timestamp?: number // 请求发起时间
    method?: string
    url?: string
    statusCode?: number // 请求状态
    timelineColor?: string
    time?: number // 请求耗时
    isMock?: boolean // 是否为Mock数据
    headers?: any // 请求头
    requestData?: any // 请求参数
    data?: any
    responseHeaders?: any // 响应头
    responseData?: any // 响应数据
  }

  export interface ProxyStatRecord extends ProxyRequestRecord {
    timelineColor?: string
    statistics: {
      bps: StatisticRecord[]
    }
  }

  export class MockRule {
    _id: string
    _rev: string
    name: string
    desc: string
    isMock?: boolean = false
    requests: Map<string, ProxyRequestRecord> = new Map()
    jsonRequests: JSON
  }

  export enum PorxyType {
    REQUEST = 5010,
    REQUEST_START = 5011,
    REQUEST_END = 5012,
    STATISTICS = 5020,
    SOCKET = 5030,
  }


  export function searchMockRules(keyword: string) {
    return get<Array<MockRule>>('/appmock/searchMockRules', null, { keyword })
  }

  export function getMockRuleDetail(ruleId: string) {
    return get<MockRule>('/appmock/getMockRuleDetail', null, { ruleId })
  }

  export function saveMockRule(mockRule: MockRule, onlySnap: boolean) {
    return post<string>('/appmock/saveMockRule', null, { onlySnap }, mockRule)
  }

  export function deleteMockRule(ruleId: string) {
    return post<string>('/appmock/deleteMockRule', null, { ruleId })
  }


  export async function saveProxyConfig(config: Partial<ProxyConfig>) {
    return post<string>('/appmock/saveProxyConfig', null, null, config)
  }

  export function getAllPushClients() {
    return get<Array<CommonApi.MsgPushClient>>('/appmock/getAllPushClients')
  }

  export function mockRegister(uid: string) {
    return get<string>(`/appmock/register/${uid}`)
  }

  export function broadcast(uid: string) {
    return get<string>(`/_/sse/broadcast/${uid}`)
  }
}
