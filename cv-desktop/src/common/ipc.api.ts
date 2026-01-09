import { BizConfig } from './base.models'


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


export enum cvMorphType {
  erode = 0,
  dilate,
  open,
  close,
  gradient,
  topHat,
  blackHat
}

export type cvMorph = [
  cvMorphType, // MorphType erode, dilate, open, close
  number, // iterations
  number, // sizeX,
  number, // sizeY
]

export type cvEqualizeHist = [
  string, // type equalizeHist
  number, // clipLimit
  number, // tileGridSizeX
  number, // tileGridSizeY
]

export type cvSharpen = [
  string, // type laplacian, usm
  number, // dx
  number, // dy
  number, // scale
]

export enum cvBlurType {
  gaussian = 0,
  median,
  avg,
  bilateral
}

export type cvBlur = [
  cvBlurType, // cvBlurType
  number, // sizeX
  number, // sizeY
  number, // aperture
  number, // diameter
  number, // sigmaColor
  number  // sigmaSpace
]

export enum cvFilterType {
  sobel = 0,
  laplace,
  scharr
}

export type cvFilter = [
  cvFilterType, // type sobel, laplacian, scharr
  number, // dx
  number, // dy
  number, // scale
  number, // size
]

export type cvDetector = [
  string, // type meanShift, camShift
  number, // threshold
  number, // minSize
]

export interface ICVAPI {
  init(): Promise<void>
  dispose(): void
  imgProcess(frame: ImageData, params: Partial<{
    isGray: boolean,
    rotate: number,
    colorMap: number,
    morph: cvMorph,
    gamma: number,
    equalization: cvEqualizeHist,
    sharpen: cvSharpen,
    blur: cvBlur,
    filter: cvFilter,
    detector: cvDetector,
    canny: [number, number],
  }>): Promise<Uint8ClampedArray>

  findContours(data: Uint8Array, width: number, height: number): Array<[number, number]>
  // faceRecognize(frame: ImageData, width: number, height: number): { face: any, eyes: Array<any>, landmarks: Array<any> } | null
}

export interface ITensorflowApi {
  init(backend: 'mediapipe-gpu' | 'tfjs-webgl'): Promise<void>
  destroy(): void
  detect(video: ImageData): Promise<any[]>
}