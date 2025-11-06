import { contextBridge } from 'electron'
import cvApi from './CVApi'
import mainApi from './MainApi'

contextBridge.exposeInMainWorld('mainApi', mainApi)
contextBridge.exposeInMainWorld('cv', cvApi)