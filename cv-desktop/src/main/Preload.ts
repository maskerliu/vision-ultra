import { contextBridge } from 'electron'
import instance from './ipc/cv.backend'
import mainApi from './ipc/main.api'

contextBridge.exposeInMainWorld('mainApi', mainApi)
contextBridge.exposeInMainWorld('cvBackend', instance)
// contextBridge.exposeInMainWorld('tfApi', tfApi)