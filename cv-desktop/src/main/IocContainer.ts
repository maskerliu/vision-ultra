import { Container } from 'inversify'
import { IocTypes } from './MainConst'
import { FaceRecRepo } from './repository/facerec.repo'
import { CommonRouter, MapiRouter, FaceRecRouter } from './router'
import { CommonService, FaceRecService, MapiService, PushService } from './service'

const bizContainer = new Container({ defaultScope: 'Singleton' })
bizContainer.bind<MapiRouter>(IocTypes.MapiRouter).to(MapiRouter)
bizContainer.bind<CommonRouter>(IocTypes.CommonRouter).to(CommonRouter)
bizContainer.bind<FaceRecRouter>(IocTypes.FaceRecRouter).to(FaceRecRouter)
bizContainer.bind<MapiService>(IocTypes.MapiService).to(MapiService)
bizContainer.bind<CommonService>(IocTypes.CommonService).to(CommonService)
bizContainer.bind<PushService>(IocTypes.PushService).to(PushService)
bizContainer.bind<FaceRecService>(IocTypes.FaceRecService).to(FaceRecService)
bizContainer.bind<FaceRecRepo>(IocTypes.FaceRecRepo).to(FaceRecRepo)

export { bizContainer }

