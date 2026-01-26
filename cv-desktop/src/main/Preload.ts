import { contextBridge } from 'electron'
import mainApi from './MainApi'

contextBridge.exposeInMainWorld('mainApi', mainApi)
// contextBridge.exposeInMainWorld('cvBackend', cvBackend)
// contextBridge.exposeInMainWorld('tfApi', tfApi)