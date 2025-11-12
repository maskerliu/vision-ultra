import { app } from 'electron'

export const IS_DEV = process.env.NODE_ENV === 'development'
export const Lynx_Mqtt_Broker = 'f9cc4cbec7c54744b1448fe4e6bfd274.s2.eu.hivemq.cloud'

export const USER_DATA_DIR = app.getPath('userData')
export const APP_DATA_DIR = app.getPath('appData')

export const AppName = 'VisionUltra'

export const IocTypes = {
  CommonRouter: Symbol.for('CommonRouter'),
  MapiRouter: Symbol.for('MapiRouter'),
  MapiService: Symbol.for('MapiService'),
  CommonService: Symbol.for('CommonService'),
  PushService: Symbol.for('PushService'),
  FaceRecRepo: Symbol.for('FaceRecRepo')
}