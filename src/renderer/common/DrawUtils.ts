import { NormalizedLandmark } from '@mediapipe/face_mesh'
import { FACEMESH_CONTOUR, TRIANGULATION } from "./Triangulation"

const Object_Labels = [
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

class Colors {
  // ultralytics color palette https://ultralytics.com/
  private palette: string[]
  private n: number

  constructor() {
    this.palette = [
      "#FF3838",
      "#FF9D97",
      "#FF701F",
      "#FFB21D",
      "#CFD231",
      "#48F90A",
      "#92CC17",
      "#3DDB86",
      "#1A9334",
      "#00D4BB",
      "#2C99A8",
      "#00C2FF",
      "#344593",
      "#6473FF",
      "#0018EC",
      "#8438FF",
      "#520085",
      "#CB38FF",
      "#FF95C8",
      "#FF37C7",
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

export const NUM_KEYPOINTS = 468
const NUM_IRIS_KEYPOINTS = 5
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

export type FaceResult = {
  landmarks: Float16Array,
  box: BoundingBox,
  valid: boolean
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

const colors = new Colors()
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

function distance(a: number[], b: number[]) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))
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

function drawMutliLine(context: CanvasRenderingContext2D,
  points: Array<any>, start: number, end: number, closed: boolean = false) {
  context.beginPath()
  context.strokeStyle = BLUE
  context.lineWidth = 4
  context.moveTo(points[start].x, points[start].y)
  for (let i = start; i < end; ++i) {
    context.lineTo(points[i].x, points[i].y)
  }
  if (closed) {
    context.lineTo(points[start].x, points[start].y)
  }
  context.stroke()
  context.closePath()
}

export function drawCVObjectTrack(context: CanvasRenderingContext2D,
  boxs: Array<{ x: number, y: number, width: number, height: number }>) {
  if (boxs == null || boxs.length == 0) return
  context.strokeStyle = GREEN
  context.lineWidth = 2
  boxs.forEach((box) => {
    context.beginPath()
    context.strokeRect(box.x, box.y, box.width, box.height)
    context.closePath()
  })
}

export function drawCVFaceResult(context: CanvasRenderingContext2D,
  face: any, eyes: Array<any>, landmarks?: Array<any>) {
  if (face == null) return
  context.beginPath()
  context.strokeStyle = GREEN
  context.lineWidth = 3
  context.strokeRect(face.x, face.y, face.width, face.height)
  context.closePath()

  eyes?.forEach((eye) => {
    context.beginPath()
    context.strokeStyle = RED
    context.lineWidth = 2
    context.ellipse(eye.x + face.x + eye.width / 2, eye.y + face.y + eye.height / 2,
      eye.width / 2, eye.height / 2, 0, 0, Math.PI * 2)
    context.stroke()
    context.closePath()
  })


  if (landmarks.length == 68) {
    drawMutliLine(context, landmarks, 0, 17) // Jaw
    drawMutliLine(context, landmarks, 17, 22) // Left brow
    drawMutliLine(context, landmarks, 22, 27) // Right brow
    drawMutliLine(context, landmarks, 27, 31) // Nose
    drawMutliLine(context, landmarks, 31, 36) // Nose bottom
    drawMutliLine(context, landmarks, 36, 42, true) // Left eye
    drawMutliLine(context, landmarks, 42, 48, true) // Right eye
    drawMutliLine(context, landmarks, 48, 60, true) // Outer lip
    drawMutliLine(context, landmarks, 60, 68, true) // Inner lip
  } else {
    landmarks?.forEach((landmark) => {
      context.beginPath()
      context.fillStyle = PURPLE
      context.arc(landmark.x, landmark.y, 2, 0, Math.PI * 2)
      context.fill()
      context.closePath()
    })
  }
  landmarks?.forEach((landmark) => {
    context.beginPath()
    context.fillStyle = PURPLE
    context.arc(landmark.x, landmark.y, 2, 0, Math.PI * 2)
    context.fill()
    context.closePath()
  })
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

export function landmarksToFace(landmarks: NormalizedLandmark[], face: FaceResult, width: number, height: number) {
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
  boxes: Float32Array, scores: Float16Array, classes: Uint8Array,
  objNum: number, scale: [number, number]) {
  if (scores == null || scores.length === 0) return
  ctx.font = `10px Arial`
  ctx.textBaseline = "top"
  for (let i = 0; i < objNum; ++i) {
    let score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    const klass = Object_Labels[classes[i]]
    const color = colors.get(classes[i])
    let y1 = boxes[i * 4] * scale[1]
    let x1 = boxes[i * 4 + 1] * scale[0]
    let y2 = boxes[i * 4 + 2] * scale[1]
    let x2 = boxes[i * 4 + 3] * scale[0]
    const width = x2 - x1
    const height = y2 - y1

    ctx.fillStyle = Colors.hexToRgba(color, 0.2)
    ctx.fillRect(x1, y1, width, height)

    ctx.strokeStyle = Colors.hexToRgba(color, 0.8)
    ctx.lineWidth = 1
    ctx.strokeRect(x1, y1, width, height)

    ctx.fillStyle = color
    ctx.fillText(`${score}%`, x1 + 5, y1 + 5)
  }
}

export function drawTFFaceResult(ctx: CanvasRenderingContext2D,
  face: FaceResult, mesh: 'mesh' | 'dot' | 'none' = 'none',
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

export function getFaceContour(face: FaceResult, scale: number = 1, orginX: number = 0, originY: number = 0) {
  FACEMESH_CONTOUR.faceOval.forEach((val, idx) => {
    SharedPaths.faceOval[idx * FACE_DIMS] = face.landmarks[val * FACE_DIMS] * scale + orginX
    SharedPaths.faceOval[idx * FACE_DIMS + 1] = face.landmarks[val * FACE_DIMS + 1] * scale + originY
    if (FACE_DIMS == 3) SharedPaths.faceOval[idx * FACE_DIMS + 2] = face.landmarks[val * FACE_DIMS + 2]
  })

  return SharedPaths.faceOval
}

export function getFaceSlope(face: FaceResult) {
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
