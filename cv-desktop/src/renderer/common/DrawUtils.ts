import { NormalizedLandmark } from '@mediapipe/face_mesh'
import { FACEMESH_CONTOUR, TRIANGULATION } from "./Triangulation"

export const Def_Object_Labels = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
  "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
  "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
  "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
  "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
  "hair drier", "toothbrush"
]

export class MarkColors {
  private palette: string[]
  private n: number

  constructor() {
    this.palette = [
      "#FEA47F",
      "#25CCF7",
      "#EAB543",
      "#55E6C1",
      "#CAD3C8",
      "#F97F51",
      "#1B9CFC",
      "#F8EFBA",
      "#58B19F",
      "#2C3A47",
      "#B33771",
      "#3B3B98",
      "#FD7272",
      "#9AECDB",
      "#D6A2E8",
      "#6D214F",
      "#182C61",
      "#FC427B",
      "#BDC581",
      "#82589F",
    ]
    this.n = this.palette.length
  }

  get = (i) => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex, alpha) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `rgba(${[parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)].join(
        ", "
      )}, ${alpha})`
      : null
  };
}

export const NUM_KEYPOINTS = 478
const GREEN = '#32EEDB'
const RED = '#FF2C35'
const BLUE = '#157AB3'
const YELLOW = '#F8E16C'
const WHITE = '#ffffff'
const SILVERY = '#f1f2f6'
const PURPLE = '#7F00FF'

export const LABEL_TO_COLOR = {
  lips: PURPLE,
  leftEye: BLUE,
  leftEyebrow: BLUE,
  leftIris: YELLOW,
  rightEye: RED,
  rightEyebrow: RED,
  rightIris: YELLOW,
  faceOval: SILVERY,
}

export type FaceDetectResult = {
  landmarks: Float16Array,
  box: BoundingBox,
  valid: boolean,
  expire: number,
}

export type ObjectDetectResult = {
  classes: Uint8Array,
  scores: Float16Array,
  boxes: Float16Array,
  objNum: number,
  scale: [number, number],
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

export type KeyPoint = {
  x: number,
  y: number
  z: number,
  idx: number
}

export const FACE_DIMS: number = 2

export const MARK_COLORS = new MarkColors()
const SharedPaths: {
  lips?: Float16Array,
  leftEye?: Float16Array,
  leftEyebrow?: Float16Array,
  rightEye?: Float16Array,
  rightEyebrow?: Float16Array,
  leftIris?: Float16Array,
  rightIris?: Float16Array,
  faceOval?: Float16Array,
  mesh?: Float16Array,
  corner?: Float16Array
  isInited: boolean
} = {
  isInited: false
}

export function CREATE_SHARE_PATHS() {
  if (SharedPaths.isInited) return
  SharedPaths.lips = new Float16Array(FACEMESH_CONTOUR.lips.length * FACE_DIMS)
  SharedPaths.leftEye = new Float16Array(FACEMESH_CONTOUR.leftEye.length * FACE_DIMS)
  SharedPaths.leftEyebrow = new Float16Array(FACEMESH_CONTOUR.leftEyebrow.length * FACE_DIMS)
  SharedPaths.rightEye = new Float16Array(FACEMESH_CONTOUR.rightEye.length * FACE_DIMS)
  SharedPaths.rightEyebrow = new Float16Array(FACEMESH_CONTOUR.rightEyebrow.length * FACE_DIMS)
  SharedPaths.leftIris = new Float16Array(FACEMESH_CONTOUR.leftIris.length * FACE_DIMS)
  SharedPaths.rightIris = new Float16Array(FACEMESH_CONTOUR.rightIris.length * FACE_DIMS)
  SharedPaths.faceOval = new Float16Array(FACEMESH_CONTOUR.faceOval.length * FACE_DIMS)
  SharedPaths.mesh = new Float16Array(TRIANGULATION.length * FACE_DIMS)
  SharedPaths.corner = new Float16Array(12 * FACE_DIMS)
  SharedPaths.isInited = true
}

function drawPath(ctx: CanvasRenderingContext2D, points: Float16Array, start: number, end: number, closedPath = false) {
  const region = new Path2D()
  region.moveTo(points[start], points[start + 1])
  for (let i = start + FACE_DIMS; i < end; i += FACE_DIMS) {
    region.lineTo(points[i], points[i + 1])
    // region.arcTo(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], 10)
  }

  if (closedPath) region.closePath()

  ctx.stroke(region)
}

function drawFaceCorner(ctx: CanvasRenderingContext2D, box: BoundingBox) {
  ctx.strokeStyle = SILVERY
  ctx.lineWidth = 3

  const w = box.width / 6
  //   [box.xMin + w, box.yMin], [box.xMin, box.yMin], [box.xMin, box.yMin + w]
  SharedPaths.corner[0] = box.xMin + w
  SharedPaths.corner[1] = box.yMin
  SharedPaths.corner[FACE_DIMS] = box.xMin
  SharedPaths.corner[FACE_DIMS + 1] = box.yMin
  SharedPaths.corner[2 * FACE_DIMS] = box.xMin
  SharedPaths.corner[2 * FACE_DIMS + 1] = box.yMin + w
  drawPath(ctx, SharedPaths.corner, 0, 3 * FACE_DIMS)
  //   [box.xMax - w, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMin + w]
  SharedPaths.corner[3 * FACE_DIMS] = box.xMax - w
  SharedPaths.corner[3 * FACE_DIMS + 1] = box.yMin
  SharedPaths.corner[4 * FACE_DIMS] = box.xMax
  SharedPaths.corner[4 * FACE_DIMS + 1] = box.yMin
  SharedPaths.corner[5 * FACE_DIMS] = box.xMax
  SharedPaths.corner[5 * FACE_DIMS + 1] = box.yMin + w
  drawPath(ctx, SharedPaths.corner, 3 * FACE_DIMS, 6 * FACE_DIMS)

  //   [box.xMin, box.yMax - w], [box.xMin, box.yMax], [box.xMin + w, box.yMax]
  SharedPaths.corner[6 * FACE_DIMS] = box.xMin
  SharedPaths.corner[6 * FACE_DIMS + 1] = box.yMax - w
  SharedPaths.corner[7 * FACE_DIMS] = box.xMin
  SharedPaths.corner[7 * FACE_DIMS + 1] = box.yMax
  SharedPaths.corner[8 * FACE_DIMS] = box.xMin + w
  SharedPaths.corner[8 * FACE_DIMS + 1] = box.yMax
  drawPath(ctx, SharedPaths.corner, 6 * FACE_DIMS, 9 * FACE_DIMS)
  //   [box.xMax, box.yMax - w], [box.xMax, box.yMax], [box.xMax - w, box.yMax]
  SharedPaths.corner[9 * FACE_DIMS] = box.xMax
  SharedPaths.corner[9 * FACE_DIMS + 1] = box.yMax - w
  SharedPaths.corner[10 * FACE_DIMS] = box.xMax
  SharedPaths.corner[10 * FACE_DIMS + 1] = box.yMax
  SharedPaths.corner[11 * FACE_DIMS] = box.xMax - w
  SharedPaths.corner[11 * FACE_DIMS + 1] = box.yMax
  drawPath(ctx, SharedPaths.corner, 9 * FACE_DIMS, 12 * FACE_DIMS)
}

export function landmarksToFace(landmarks: NormalizedLandmark[], face: FaceDetectResult, width: number, height: number) {
  if (landmarks == null || landmarks.length == 0) {
    face.valid = false
    return
  }

  var xMin = Number.MAX_SAFE_INTEGER
  var xMax = Number.MIN_SAFE_INTEGER
  var yMin = Number.MAX_SAFE_INTEGER
  var yMax = Number.MIN_SAFE_INTEGER

  for (let i = 0; i < landmarks.length; i++) {
    var landmark = landmarks[i]
    xMin = Math.min(xMin, landmark.x * width)
    xMax = Math.max(xMax, landmark.x * width)
    yMin = Math.min(yMin, landmark.y * height)
    yMax = Math.max(yMax, landmark.y * height)
    face.landmarks[i * FACE_DIMS] = landmarks[i].x * width
    face.landmarks[i * FACE_DIMS + 1] = landmarks[i].y * height
    // face.landmarks[i * 3 + 2] = landmarks[i].z
  }

  face.box.xMax = xMax
  face.box.xMin = xMin
  face.box.yMax = yMax
  face.box.yMin = yMin
  face.box.width = xMax - xMin
  face.box.height = yMax - yMin

  let normilize = Math.max(face.box.width, face.box.height)
  for (let i = 0; i < face.landmarks.length; i += FACE_DIMS) {
    face.landmarks[i] = (face.landmarks[i] - face.box.xMin) / normilize
    face.landmarks[i + 1] = (face.landmarks[i + 1] - face.box.yMin) / normilize
  }

  face.valid = true
}

export function drawObjectDetectResult(ctx: CanvasRenderingContext2D,
  boxes: Float16Array, scores: Float16Array, classes: Uint8Array,
  objNum: number, scale: [number, number]) {
  if (objNum == 0) return
  ctx.font = `8px Arial`
  ctx.textBaseline = "top"
  let score = '0.0', x1 = 0, y1 = 0, x2 = 0, y2 = 0, width = 0, height = 0, color = '', klass = ''
  for (let i = 0; i < objNum; ++i) {
    score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    klass = Def_Object_Labels[classes[i]]
    color = MARK_COLORS.get(classes[i])
    y1 = boxes[i * 4] * scale[1]
    x1 = boxes[i * 4 + 1] * scale[0]
    y2 = boxes[i * 4 + 2] * scale[1]
    x2 = boxes[i * 4 + 3] * scale[0]
    width = x2 - x1
    height = y2 - y1

    ctx.fillStyle = MarkColors.hexToRgba(color, 0.2)
    ctx.fillRect(x1, y1, width, height)

    ctx.strokeStyle = MarkColors.hexToRgba(color, 1)
    ctx.lineWidth = 1
    ctx.strokeRect(x1, y1, width, height)

    ctx.fillStyle = MarkColors.hexToRgba(color, 0.8)
    ctx.fillRect(x1 + width / 2 - 20, y1 + height / 2 - 7, 40, 10)

    ctx.fillStyle = WHITE
    ctx.fillText(`${score}%`, x1 + width / 2 - 18, y1 + height / 2 - 5)
  }
}

export function drawTFFaceResult(ctx: CanvasRenderingContext2D,
  face: FaceDetectResult, mesh: 'mesh' | 'dot' | 'none' = 'none',
  eigen = false, boundingBox = false, scale?: number) {
  CREATE_SHARE_PATHS()
  if (face?.landmarks == null || face?.landmarks?.length === 0) return
  let normilize = scale ? scale : Math.max(face.box.width, face.box.height)
  let orginX = scale ? 0 : face.box.xMin
  let originY = scale ? 0 : face.box.yMin

  if (boundingBox && face.box != null) {
    drawFaceCorner(ctx, face.box)
  }

  switch (mesh) {
    case 'mesh':
      ctx.strokeStyle = SILVERY
      ctx.lineWidth = 0.5
      for (let i = 0; i < TRIANGULATION.length / 3; i++) {
        [TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2]].forEach((val, idx) => {
          SharedPaths.mesh[i * 3 * FACE_DIMS + idx * FACE_DIMS] = face.landmarks[val * FACE_DIMS] * normilize + orginX
          SharedPaths.mesh[i * 3 * FACE_DIMS + idx * FACE_DIMS + 1] = face.landmarks[val * FACE_DIMS + 1] * normilize + originY
          if (FACE_DIMS == 3) SharedPaths.mesh[i * 3 * FACE_DIMS + idx * FACE_DIMS + 2] = face.landmarks[val * FACE_DIMS + 2]
        })
        drawPath(ctx, SharedPaths.mesh, i * 3 * FACE_DIMS, i * 3 * FACE_DIMS + 3 * FACE_DIMS, true)
      }
      break
    case 'dot':
      ctx.fillStyle = SILVERY
      for (let i = 0; i < NUM_KEYPOINTS; i++) {
        ctx.beginPath()
        ctx.arc(face.landmarks[i * FACE_DIMS] * normilize + orginX,
          face.landmarks[i * FACE_DIMS + 1] * normilize + originY, 1.5 /* radius */, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
      }
      break
  }

  if (!eigen) return
  for (const [label, contour] of Object.entries(FACEMESH_CONTOUR)) {
    ctx.strokeStyle = LABEL_TO_COLOR[label]
    ctx.lineWidth = 2
    contour.forEach((val, idx) => {
      SharedPaths[label][idx * FACE_DIMS] = face.landmarks[val * FACE_DIMS] * normilize + orginX
      SharedPaths[label][idx * FACE_DIMS + 1] = face.landmarks[val * FACE_DIMS + 1] * normilize + originY
      if (FACE_DIMS == 3) SharedPaths[label][idx * FACE_DIMS + 2] = face.landmarks[val * FACE_DIMS + 2]
    })
    drawPath(ctx, SharedPaths[label], 0, SharedPaths[label].length)
  }
}

export function getFaceContour(face: FaceDetectResult, scale: number = 1, orginX: number = 0, originY: number = 0) {
  FACEMESH_CONTOUR.faceOval.forEach((val, idx) => {
    SharedPaths.faceOval[idx * FACE_DIMS] = face.landmarks[val * FACE_DIMS] * scale + orginX
    SharedPaths.faceOval[idx * FACE_DIMS + 1] = face.landmarks[val * FACE_DIMS + 1] * scale + originY
    if (FACE_DIMS == 3) SharedPaths.faceOval[idx * FACE_DIMS + 2] = face.landmarks[val * FACE_DIMS + 2]
  })

  return SharedPaths.faceOval
}

export function getFaceSlope(face: FaceDetectResult) {
  if (face == null) return 0
  FACEMESH_CONTOUR.leftIris.forEach((val, idx) => {
    SharedPaths.leftIris[idx * FACE_DIMS] = face.landmarks[val * FACE_DIMS]
    SharedPaths.leftIris[idx * FACE_DIMS + 1] = face.landmarks[val * FACE_DIMS + 1]
    if (FACE_DIMS == 3) SharedPaths.leftIris[idx * FACE_DIMS + 2] = face.landmarks[val * FACE_DIMS + 2]
  })

  FACEMESH_CONTOUR.rightIris.forEach((val, idx) => {
    SharedPaths.rightIris[idx * FACE_DIMS] = face.landmarks[val * FACE_DIMS]
    SharedPaths.rightIris[idx * FACE_DIMS + 1] = face.landmarks[val * FACE_DIMS + 1]
    if (FACE_DIMS == 3) SharedPaths.leftIris[idx * FACE_DIMS + 2] = face.landmarks[val * FACE_DIMS + 2]
  })

  let size = SharedPaths.rightIris.length / FACE_DIMS
  let left = { x: 0, y: 0 }, right = { x: 0, y: 0 }
  for (let i = 0; i < size; i++) {
    left.x += SharedPaths.rightIris[i * FACE_DIMS]
    left.y += SharedPaths.rightIris[i * FACE_DIMS + 1]

    right.x += SharedPaths.rightIris[i * FACE_DIMS]
    right.y += SharedPaths.rightIris[i * FACE_DIMS + 1]
  }

  left.x /= size
  left.y /= size

  right.x /= size
  right.y /= size

  return (right.x - left.x) / (right.y - left.y)
}

function landmarksToBox(landmarks: Array<KeyPoint>, imgWidth: number, imgHeight: number) {
  var xMin = Number.MAX_SAFE_INTEGER
  var xMax = Number.MIN_SAFE_INTEGER
  var yMin = Number.MAX_SAFE_INTEGER
  var yMax = Number.MIN_SAFE_INTEGER
  for (var i = 0; i < landmarks.length; ++i) {
    var landmark = landmarks[i]
    xMin = Math.min(xMin, landmark.x * imgWidth)
    xMax = Math.max(xMax, landmark.x * imgWidth)
    yMin = Math.min(yMin, landmark.y * imgHeight)
    yMax = Math.max(yMax, landmark.y * imgHeight)
  }
  let boundingBox: BoundingBox =
    { xMin: xMin, yMin: yMin, xMax: xMax, yMax: yMax, width: (xMax - xMin), height: (yMax - yMin) }
  return boundingBox
}
