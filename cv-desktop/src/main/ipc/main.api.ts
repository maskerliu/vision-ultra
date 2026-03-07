import { ipcRenderer } from 'electron'
import { IMainAPI, MainApiCmd } from '../../shared'
import { BizConfig } from '../../shared/base.models'

const mainApi: IMainAPI = {
  relaunch() {
    ipcRenderer.invoke(MainApiCmd.Relaunch)
  },
  selectFile(callback: Function): void {
    ipcRenderer.invoke(MainApiCmd.SelectFile)
    ipcRenderer.once(MainApiCmd.SelectFile, (event, result) => callback(result))
  },
  selectFolder(callback: Function): void {
    ipcRenderer.invoke(MainApiCmd.SelectFolder)
    ipcRenderer.once(MainApiCmd.SelectFolder, (event, result) => callback(result))
  },
  openFolder(path: string) {
    ipcRenderer.invoke(MainApiCmd.OpenFolder, path)
  },
  saveFile(title: string, fileName: string, file: string | ArrayBuffer, slient: boolean = false): void {
    ipcRenderer.invoke(MainApiCmd.SaveFileAs, title, fileName, file, slient)
    // ipcRenderer.once(MainAPICMD.SaveFileAs, (event, result) => callback(result))
  },
  openDevTools(...args: any) {
    ipcRenderer.invoke(MainApiCmd.OpenDevTools, args)
  },

  downloadUpdate(newVersion: any) {
    ipcRenderer.invoke(MainApiCmd.DownloadUpdate, newVersion)
  },

  sendServerEvent(): void {
    ipcRenderer.invoke(MainApiCmd.SendServerEvent)
  },

  getBizConfig(callback: (result: BizConfig) => void) {
    ipcRenderer.once(MainApiCmd.GetBizConfig, (_event, result: BizConfig) => callback(result))
  },

  updateBizConfig(...args: any) {
    ipcRenderer.invoke(MainApiCmd.UpdateBizConfig, args)
  },

  setAppTheme(theme: ('system' | 'light' | 'dark')) {
    ipcRenderer.invoke(MainApiCmd.SetAppTheme, theme)
  },

  getSysTheme(callback: any) {
    ipcRenderer.once(MainApiCmd.GetSysTheme, (theme) => callback(theme))
  },

  onOpenSettings(callback: any) {
    ipcRenderer.once(MainApiCmd.OpenSettings, (_event) => callback())
  },

  onSysThemeChanged(callback: (theme: string) => void) {
    ipcRenderer.once(MainApiCmd.SysThemeChanged, (_, theme: string) => callback(theme))
  },

  onDownloadUpdate(callback: (...args: any) => void) {
    ipcRenderer.once(MainApiCmd.DownloadUpdate, (_, ...args: any) => callback(...args))
  },
}

export default mainApi