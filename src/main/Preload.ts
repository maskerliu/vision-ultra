import { contextBridge } from 'electron'
import cvApi from './CVApi'
import mainApi from './MainApi'
import tfApi from './TFApi'

contextBridge.exposeInMainWorld('mainApi', mainApi)
contextBridge.exposeInMainWorld('cvApi', cvApi)
contextBridge.exposeInMainWorld('tfApi', tfApi)