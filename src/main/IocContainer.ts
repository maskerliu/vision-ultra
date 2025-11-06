import { Container } from 'inversify'
import { IocTypes } from './MainConst'
import { FaceRecRepo } from './repository/facerec.repo'
import { CommonRouter, MapiRouter } from './router'
import { CommonService, MapiService, PushService } from './service'

const bizContainer = new Container({ defaultScope: 'Singleton' })
bizContainer.bind<MapiRouter>(IocTypes.MapiRouter).to(MapiRouter)
bizContainer.bind<CommonRouter>(IocTypes.CommonRouter).to(CommonRouter)
bizContainer.bind<MapiService>(IocTypes.MapiService).to(MapiService)
bizContainer.bind<CommonService>(IocTypes.CommonService).to(CommonService)
bizContainer.bind<PushService>(IocTypes.PushService).to(PushService)
bizContainer.bind<FaceRecRepo>(IocTypes.FaceRecRepo).to(FaceRecRepo)

export { bizContainer }

