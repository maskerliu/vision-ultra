
// import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
// import { Face } from "@tensorflow-models/face-landmarks-detection"
import { Tensor } from '@tensorflow/tfjs-core'
import { FACEMESH_CONTOUR, TRIANGULATION } from "./Triangulation"
import { FaceMesh, FACEMESH_CONTOURS, NormalizedLandmark } from '@mediapipe/face_mesh'

export const NUM_KEYPOINTS = 468
export const NUM_IRIS_KEYPOINTS = 5
export const GREEN = '#32EEDB'
export const RED = '#FF2C35'
export const BLUE = '#157AB3'
export const YELLOW = '#F8E16C'
export const WHITE = '#ffffff'
export const SILVERY = '#f1f2f6'
export const PURPLE = '#7F00FF'

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

const SharedPaths = {
  lips: new Float16Array(FACEMESH_CONTOUR.lips.length * 3),
  leftEye: new Float16Array(FACEMESH_CONTOUR.leftEye.length * 3),
  leftEyebrow: new Float16Array(FACEMESH_CONTOUR.leftEyebrow.length * 3),
  rightEye: new Float16Array(FACEMESH_CONTOUR.rightEye.length * 3),
  rightEyebrow: new Float16Array(FACEMESH_CONTOUR.rightEyebrow.length * 3),
  leftIris: new Float16Array(FACEMESH_CONTOUR.leftIris.length * 3),
  rightIris: new Float16Array(FACEMESH_CONTOUR.rightIris.length * 3),
  faceOval: new Float16Array(FACEMESH_CONTOUR.faceOval.length * 3),
  mesh: new Float16Array(TRIANGULATION.length * 3),
  corner: new Float16Array(36)
}

function distance(a: number[], b: number[]) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))
}

function drawPath(ctx: CanvasRenderingContext2D, points: Float16Array, start: number, end: number, closedPath = false) {
  const region = new Path2D()
  region.moveTo(points[start], points[start + 1])
  for (let i = start + 3; i < end; i += 3) {
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

function drawRectCorner(ctx: CanvasRenderingContext2D, box: BoundingBox) {
  ctx.strokeStyle = SILVERY
  ctx.lineWidth = 5

  const w = box.width / 6
  //   [box.xMin + w, box.yMin], [box.xMin, box.yMin], [box.xMin, box.yMin + w]
  SharedPaths.corner[0] = box.xMin + w
  SharedPaths.corner[1] = box.yMin
  SharedPaths.corner[3] = box.xMin
  SharedPaths.corner[4] = box.yMin
  SharedPaths.corner[6] = box.xMin
  SharedPaths.corner[7] = box.yMin + w
  drawPath(ctx, SharedPaths.corner, 0, 9)
  //   [box.xMax - w, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMin + w]
  SharedPaths.corner[9] = box.xMax - w
  SharedPaths.corner[10] = box.yMin
  SharedPaths.corner[12] = box.xMax
  SharedPaths.corner[13] = box.yMin
  SharedPaths.corner[15] = box.xMax
  SharedPaths.corner[16] = box.yMin + w
  drawPath(ctx, SharedPaths.corner, 9, 18)

  //   [box.xMin, box.yMax - w], [box.xMin, box.yMax], [box.xMin + w, box.yMax]
  SharedPaths.corner[18] = box.xMin
  SharedPaths.corner[19] = box.yMax - w
  SharedPaths.corner[21] = box.xMin
  SharedPaths.corner[22] = box.yMax
  SharedPaths.corner[24] = box.xMin + w
  SharedPaths.corner[25] = box.yMax
  drawPath(ctx, SharedPaths.corner, 18, 27)
  //   [box.xMax, box.yMax - w], [box.xMax, box.yMax], [box.xMax - w, box.yMax]
  SharedPaths.corner[27] = box.xMax
  SharedPaths.corner[28] = box.yMax - w
  SharedPaths.corner[30] = box.xMax
  SharedPaths.corner[31] = box.yMax
  SharedPaths.corner[33] = box.xMax - w
  SharedPaths.corner[34] = box.yMax
  drawPath(ctx, SharedPaths.corner, 27, 36)
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
    face.landmarks[i * 3] = landmarks[i].x * width
    face.landmarks[i * 3 + 1] = landmarks[i].y * height
    face.landmarks[i * 3 + 2] = landmarks[i].z
  }

  face.box.xMax = xMax
  face.box.xMin = xMin
  face.box.yMax = yMax
  face.box.yMin = yMin
  face.box.width = xMax - xMin
  face.box.height = yMax - yMin

  let normilize = Math.max(face.box.width, face.box.height)
  for (let i = 0; i < face.landmarks.length; i += 3) {
    face.landmarks[i] = (face.landmarks[i] - face.box.xMin) / normilize
    face.landmarks[i + 1] = (face.landmarks[i + 1] - face.box.yMin) / normilize
  }

  face.valid = true
}

export function drawTFFaceResult(ctx: CanvasRenderingContext2D,
  face: FaceResult, mesh: 'mesh' | 'dot' | 'none' = 'none',
  eigen = false, boundingBox = false, scale?: number) {
  if (face.landmarks == null || face.landmarks?.length === 0) return
  let normilize = scale ? scale : Math.max(face.box.width, face.box.height)
  let orginX = scale ? 0 : face.box.xMin
  let originY = scale ? 0 : face.box.yMin

  if (boundingBox && face.box != null) {
    drawRectCorner(ctx, face.box)
  }

  switch (mesh) {
    case 'mesh':
      ctx.strokeStyle = SILVERY
      ctx.lineWidth = 0.5
      for (let i = 0; i < TRIANGULATION.length / 3; i++) {
        [TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2]].forEach((val: number, idx: number) => {
          SharedPaths.mesh[i * 9 + idx * 3] = face.landmarks[val * 3] * normilize + orginX
          SharedPaths.mesh[i * 9 + idx * 3 + 1] = face.landmarks[val * 3 + 1] * normilize + originY
          SharedPaths.mesh[i * 9 + idx * 3 + 2] = face.landmarks[val * 3 + 2]
        })
        drawPath(ctx, SharedPaths.mesh, i * 9, i * 9 + 9, true)
      }
      break
    case 'dot':
      ctx.fillStyle = SILVERY
      for (let i = 0; i < NUM_KEYPOINTS; i++) {
        ctx.beginPath()
        ctx.arc(face.landmarks[i * 3] * normilize + orginX,
          face.landmarks[i * 3 + 1] * normilize + originY, 1.5 /* radius */, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
      }
      break
  }

  if (!eigen) return
  for (const [label, contour] of Object.entries(FACEMESH_CONTOUR)) {
    ctx.strokeStyle = LABEL_TO_COLOR[label]
    ctx.lineWidth = 2
    contour.forEach((val: number, idx: number) => {
      SharedPaths[label][idx * 3] = face.landmarks[val * 3] * normilize + orginX
      SharedPaths[label][idx * 3 + 1] = face.landmarks[val * 3 + 1] * normilize + originY
      SharedPaths[label][idx * 3 + 2] = face.landmarks[val * 3 + 2]
    })
    drawPath(ctx, SharedPaths[label], 0, SharedPaths[label].length)
  }
}

export function getFaceContour(face: FaceResult, scale: number = 1, orginX: number = 0, originY: number = 0) {
  FACEMESH_CONTOUR.faceOval.forEach((val: number, idx: number) => {
    SharedPaths.faceOval[idx * 3] = face.landmarks[val * 3] * scale + orginX
    SharedPaths.faceOval[idx * 3 + 1] = face.landmarks[val * 3 + 1] * scale + originY
    SharedPaths.faceOval[idx * 3 + 2] = face.landmarks[val * 3 + 2]
  })

  return SharedPaths.faceOval
}

export function getFaceSlope(face: FaceResult) {
  if (face == null) return 0
  let leftEye = FACEMESH_CONTOUR.leftIris.map((idx) => [face.landmarks[idx * 3], face.landmarks[idx * 3 + 1]])
  let rightEye = FACEMESH_CONTOUR.rightIris.map((idx) => [face.landmarks[idx * 3], face.landmarks[idx * 3 + 1]])

  let left = [
    (leftEye[0][0] + leftEye[1][0] + leftEye[2][0] + leftEye[3][0]) / 4,
    (leftEye[0][1] + leftEye[1][1] + leftEye[2][1] + leftEye[3][1]) / 4
  ]

  let right = [
    (rightEye[0][0] + rightEye[1][0] + rightEye[2][0] + rightEye[3][0]) / 4,
    (rightEye[0][1] + rightEye[1][1] + rightEye[2][1] + rightEye[3][1]) / 4
  ]

  return (right[0] - left[0]) / (right[1] - left[1])
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
