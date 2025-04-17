import { ipcRenderer } from 'electron'
import { BizConfig } from '../common/base.models'
import { IMainAPI, MainAPICMD } from '../common/ipc.api'

let mainApis: IMainAPI = {
  relaunch() {
    ipcRenderer.invoke(MainAPICMD.Relaunch)
  },
  openFile(): Promise<any> {
    let promise = new Promise<any>((resolve, reject) => {
      ipcRenderer.invoke(MainAPICMD.OpenFile).then((filePath) => {
        console.info('filePath', filePath)
        resolve(filePath)
      }).catch((err) => {
        console.error('Error opening file:', err)
        reject(err)
      })
    })

    return promise
  },
  openDevTools(...args: any) {
    ipcRenderer.invoke(MainAPICMD.OpenDevTools, args)
  },
  saveSysSettings(...args: any) {
    ipcRenderer.invoke(MainAPICMD.SaveSysSettings, args)
  },
  downloadUpdate(newVersion: any) {
    ipcRenderer.invoke(MainAPICMD.DownloadUpdate, newVersion)
  },

  sendServerEvent(): void {
    ipcRenderer.invoke(MainAPICMD.SendServerEvent)
  },

  getSysSettings(callback: (result: BizConfig) => void) {
    ipcRenderer.on(MainAPICMD.GetSysSettings, (_event, result: BizConfig) => callback(result))
  },

  setAppTheme(theme: ('system' | 'light' | 'dark')) {
    ipcRenderer.invoke(MainAPICMD.SetAppTheme, theme)
  },

  getSysTheme(callback: any) {
    ipcRenderer.on(MainAPICMD.GetSysTheme, (theme) => callback(theme))
  },

  onOpenMockRuleMgr(callback: any) {
    ipcRenderer.on(MainAPICMD.OpenMockRuleMgr, (_event) => callback())
  },

  onOpenSettings(callback: any) {
    ipcRenderer.on(MainAPICMD.OpenSettings, (_event) => callback())
  },

  onSysThemeChanged(callback: (theme: string) => void) {
    ipcRenderer.on(MainAPICMD.SysThemeChanged, (_, theme: string) => callback(theme))
  },

  onDownloadUpdate(callback: (...args: any) => void) {
    ipcRenderer.on(MainAPICMD.DownloadUpdate, (_, ...args: any) => callback(...args))
  },
}

export default mainApis