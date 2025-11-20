import { contextBridge } from 'electron'
import cvWasmApi from './CVApi.wasm'
import cvNativeApi from './CVApi.native'
import mainApi from './MainApi'
import tfApi from './TFApi'

contextBridge.exposeInMainWorld('mainApi', mainApi)
contextBridge.exposeInMainWorld('cvWasmApi', cvWasmApi)
contextBridge.exposeInMainWorld('cvNativeApi', cvNativeApi)
contextBridge.exposeInMainWorld('tfApi', tfApi)