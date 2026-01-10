export enum WorkerCMD {
  // common cmd
  init = 'init',
  dispose = 'dispose',
  process = 'process',

  // just for cv 
  updateOptions = 'updateOptions',
  findContours = 'findContours',

  // just for face detect
  faceCapture = 'faceCapture'
}

export type FaceDetectResult = {
  landmarks: Float16Array,
  box: BoundingBox,
  valid: boolean,
  expire: number,
}

export type BoundingBox = {
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
  width: number,
  height: number
}

export type ObjectDetectResult = {
  classes: Uint8Array,
  scores: Float16Array,
  boxes: Float16Array,
  objNum: number,
  scale: [number, number],
  expire: number,
}

export enum IntergrateMode {
  WebAssembly,
  Backend,
  Native
}

export enum ModelType {
  Unknown = -1,
  Classify = 0,
  Detect = 1,
  Segment = 2,
  OBB = 3,
  Pose = 4,
  GenImage = 5,
  Face = 6
}

export type ModelInfo = {
  name: string,
  type: ModelType
  desc?: string
}