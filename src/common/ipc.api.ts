import { Point2, Rect } from "@u4/opencv4nodejs"
import { BizConfig } from "./base.models"


export const MainAPICMD = {
  Relaunch: 'relaunch',
  OpenFile: 'openFile',
  OpenDevTools: 'openDevTools',
  OpenMockRuleMgr: 'openMockRuleMgr',
  OpenSettings: 'openSettings',
  GetSysSettings: 'getSysSettings',
  SaveSysSettings: 'saveSysSettings',
  SetAppTheme: 'setAppTheme',
  GetSysTheme: 'getSysTheme',
  SysThemeChanged: 'sysThemeChanged',
  DownloadUpdate: 'downloadUpdate',
  SendServerEvent: 'sendServerEvent'
}

export interface IMainAPI {

  relaunch(): void

  openFile(): Promise<any>

  openDevTools(...args: any): void

  saveSysSettings(...args: any): void

  sendServerEvent(): void

  downloadUpdate(...args: any): void

  onOpenMockRuleMgr(callback: any): void

  onOpenSettings(callback: any): void

  getSysSettings(callback: (result: BizConfig) => void): void

  setAppTheme(theme: ('system' | 'light' | 'dark')): void

  getSysTheme(callback: any): void

  onSysThemeChanged(callback: (theme: string) => void): void

  onDownloadUpdate(callback: any): void
}

export interface IOpencvAPI {
  init(): Promise<void>
  destroy(): void
  faceRecognize(frame: ImageData, width: number, height: number): { face: Rect, eyes: Array<Rect>, landmarks: Array<Point2> } | null
}