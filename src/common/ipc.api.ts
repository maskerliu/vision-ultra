import { Point2, Rect } from "@u4/opencv4nodejs"
import { BizConfig } from "./base.models"


export const MainAPICMD = {
  Relaunch: 'relaunch',
  OpenFile: 'openFile',
  SaveFileAs: 'saveFile',
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

  openFile(callback: Function): void

  saveFile(title: string, fileName: string, file: string | ArrayBuffer, slient: boolean): void

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
  imgProcess(image: ImageData, width: number, height: number, params: Partial<{
    isGray: boolean,
    equalizeHist: boolean,
    brightness: number,
    laplace: number, // 二阶导数滤波器的孔径大小，必须为正奇数
    cannyThreshold: [number, number],
    gaussian: number, // 决定滤波器的尺寸
  }>): { data: Uint8ClampedArray, width: number, height: number }
  faceRecognize(frame: ImageData, width: number, height: number): { face: Rect, eyes: Array<Rect>, landmarks: Array<Point2> } | null
}

export interface ITensorflowApi {
  init(backend: 'mediapipe-gpu' | 'tfjs-webgl'): Promise<void>
  destroy(): void
  detect(video: ImageData): Promise<any[]>
}