import { contextBridge } from 'electron'
import cvApis from './CVApis'
import mainApis from './MainApis'

contextBridge.exposeInMainWorld('electronAPI', mainApis)
contextBridge.exposeInMainWorld('cv', cvApis)