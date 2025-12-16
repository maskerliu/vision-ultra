import { contextBridge } from 'electron'
import cvNativeApi from './ipc/CVApi.native'
import cvWasmApi from './ipc/CVApi.wasm'
import tfApi from './ipc/TFApi'
import mainApi from './MainApi'

contextBridge.exposeInMainWorld('mainApi', mainApi)
contextBridge.exposeInMainWorld('cvWasmApi', cvWasmApi)
contextBridge.exposeInMainWorld('cvNativeApi', cvNativeApi)
contextBridge.exposeInMainWorld('tfApi', tfApi)

console.log('try to load native api')