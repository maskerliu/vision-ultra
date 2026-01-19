import { inject, injectable } from 'inversify'
import { API_URL } from '../../common/api.const'
import { IocTypes } from '../MainConst'
import { BizNetwork } from '../misc/utils'
import { FaceRecService } from '../service'
import { BaseRouter, ParamType } from './base.router'

@injectable()
export class FaceRecRouter extends BaseRouter {


  @inject(IocTypes.FaceRecService)
  private faceRecService: FaceRecService

  constructor() {
    super()
  }

  override initApiInfos(): void {
    this.addApiInfo({
      method: BizNetwork.Method_Get,
      path: `${API_URL.F_List}/:keyword`,
      func: 'list', target: 'faceRecService',
      params: [{ key: 'keyword', type: ParamType.Path }]
    })
    this.addApiInfo({
      method: BizNetwork.Method_Post, path: `${API_URL.F_Registe}`,
      func: 'registe', target: 'faceRecService',
      params: [
        { key: 'name', type: ParamType.FormBody },
        { key: 'eigen', type: ParamType.FormBody },
        { key: 'avatar', type: ParamType.FormBody }
      ]
    })
    this.addApiInfo({
      method: BizNetwork.Method_Post, path: `${API_URL.F_Delete}`,
      func: 'delete', target: 'faceRecService',
      params: [
        { key: 'eigenIds', type: ParamType.FormBody }
      ]
    })

    this.addApiInfo({
      method: BizNetwork.Method_Post, path: `${API_URL.F_Recognize}`,
      func: 'recognize', target: 'faceRecService',
      params: [{ key: 'eigen', type: ParamType.FormBody }]
    })

  }
}