import { IMainAPI, IOpencvAPI, ITensorflowApi } from "./common/ipc.api"

declare global {
  let __DEV__: boolean
  let __VUE_OPTIONS_API__: boolean

  interface Window {
    isWeb: boolean
    mainApi: IMainAPI
    cvApi: IOpencvAPI
    tfApi: ITensorflowApi
  }

  let __IS_WEB__: boolean
  let SERVER_BASE_URL: string
}