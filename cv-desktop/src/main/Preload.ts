import { contextBridge } from 'electron'
import cvBackend from './ipc/cv.backend'
import cvNative from './ipc/cv.native'
import tfApi from './ipc/TFApi'
import mainApi from './MainApi'

contextBridge.exposeInMainWorld('mainApi', mainApi)
contextBridge.exposeInMainWorld('cvBackend', cvBackend)
contextBridge.exposeInMainWorld('cvNative', cvNative)
contextBridge.exposeInMainWorld('tfApi', tfApi)