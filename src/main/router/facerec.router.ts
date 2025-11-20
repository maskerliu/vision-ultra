import { inject, injectable } from "inversify";
import { BaseRouter, ParamType } from "./base.router";
import { BizNetwork } from "../misc/utils";
import { FaceRecService } from "../service";
import { IocTypes } from "../MainConst";
import { API_URL } from "../../common/api.const";

@injectable()
export class FaceRecRouter extends BaseRouter {


  @inject(IocTypes.FaceRecService)
  private faceRecService: FaceRecService

  constructor() {
    super()
  }

  override initApiInfos(): void {
    this.addApiInfo({
      method: BizNetwork.Method_Post, path: `${API_URL.FaceRec}${API_URL.F_List}`,
       func: 'list', target: 'facerecService'
    })
     this.addApiInfo({
      method: BizNetwork.Method_Post, path: `${API_URL.FaceRec}${API_URL.F_Recognize}`,
      func: 'registe', target: 'facerecService'
    })
    this.addApiInfo({
      method: BizNetwork.Method_Post, path: `${API_URL.FaceRec}${API_URL.F_Delete}`,
      func: 'delete', target: 'facerecService'
    })

    this.addApiInfo({
      method: BizNetwork.Method_Get, path: `${API_URL.FaceRec}${API_URL.F_Recognize}`,
      func: 'recognize', target: 'facerecService',
      params: [{ key: 'uid', type: ParamType.Path }]
    })
   
  }
}