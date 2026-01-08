import { ICVAPI, IMainAPI, ITensorflowApi } from "./common"

declare global {
  let __DEV__: boolean
  let __VUE_OPTIONS_API__: boolean
  let SERVER_BASE_URL: string

  interface Window {
    isWeb: boolean
    mainApi: IMainAPI
    cvNative: ICVAPI
    cvBackend: ICVAPI
    tfBackend: ITensorflowApi
  }

}

