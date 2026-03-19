import { BizConfig } from './base.models'

export const MainApiCmd = {
  Relaunch: 'relaunch',
  SelectFile: 'selectFile',
  SelectFolder: 'selectFolder',
  OpenFolder: 'openFolder',
  SaveFileAs: 'saveFile',
  OpenDevTools: 'openDevTools',
  OpenMockRuleMgr: 'openMockRuleMgr',
  OpenSettings: 'openSettings',
  GetBizConfig: 'getBizConfig',
  UpdateBizConfig: 'updateBizConfig',
  SetAppTheme: 'setAppTheme',
  GetSysTheme: 'getSysTheme',
  SysThemeChanged: 'sysThemeChanged',
  DownloadUpdate: 'downloadUpdate',
  SendServerEvent: 'sendServerEvent'
}

export interface IMainAPI {

  relaunch(): void

  selectFile(callback: Function): void

  selectFolder(callback: Function): void

  openFolder(path: string): void

  saveFile(title: string, fileName: string, file: string | ArrayBuffer, slient: boolean): void

  openDevTools(...args: any): void

  sendServerEvent(): void

  downloadUpdate(...args: any): void

  onOpenSettings(callback: any): void

  getBizConfig(callback: (result: BizConfig) => void): void

  updateBizConfig(...args: any): void

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


export enum ProcessorCMD {
  // common cmd
  init = 'init',
  dispose = 'dispose',
  process = 'process',

  // just for cv 
  updateOptions = 'options',
  findContours = 'findContours',

  // just for face detect
  faceCapture = 'faceCapture'
}

export type CVMsg = Partial<{
  cmd: ProcessorCMD,
  image?: ImageData,
  width?: number,
  height?: number,
  masks?: Uint8Array[],
  rects?: Array<[number, number, number, number]>,
  options?: any
}>

export type ObjTrackMsg = Partial<{
  cmd: ProcessorCMD,
  model?: string,
  image?: ImageData
}>

export type FaceDetectMsg = Partial<{
  cmd: ProcessorCMD,
  image?: ImageData,
  width?: number,
  height?: number
}>

export type ImgGenMsg = Partial<{
  cmd: ProcessorCMD,
  model?: string,
  image?: ImageData,
}>

export type OCRMsg = Partial<{
  cmd: ProcessorCMD,
  model?: string,
  image?: Uint8Array,
  width?: number,
  height?: number,
}>

export type StyleTransMsg = Partial<{
  cmd: ProcessorCMD,
  styleModel?: string,
  transModel?: string,
  image?: ImageData | Uint8Array,
  style?: ImageData,
  params?: string,
  width?: number,
  height?: number
}>

export interface IProcessor {
  init(data?: any): Promise<any>
  terminate(): void
  process(data: any): Promise<any>
}

export interface ICVAPI extends IProcessor {
  options(val: any): void

  findContours(data: Uint8Array, width: number, height: number): Array<[number, number]>
}

export interface ITensorflowApi extends IProcessor {
  init(backend: 'mediapipe-gpu' | 'tfjs-webgl'): Promise<any>
  detect(video: ImageData): Promise<any[]>
}

export type FaceDetectResult = {
  landmarks: Float16Array,
  box: BoundingBox,
  valid: boolean,
  expire: number,
  ratio: number,
}

export type BoundingBox = {
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
  width: number,
  height: number
}

export type ObjectDetectResult = Partial<{
  classes: Uint8Array,
  scores: Float16Array,
  boxes: Float16Array,
  objNum: number,
  scale: [number, number],
  overlay: Uint8Array
  masks: Array<Uint8Array>
  segScale: [number, number]
  segSize: [number, number],
  expire: number,
}>

export enum IntergrateMode {
  wasm,
  backend,
  native
}