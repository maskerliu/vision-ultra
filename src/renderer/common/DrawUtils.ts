
// import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
// import { Face } from "@tensorflow-models/face-landmarks-detection"
import { Tensor } from '@tensorflow/tfjs-core'
import { FACEMESH_CONTOUR, TRIANGULATION } from "./Triangulation"
import { FACEMESH_CONTOURS } from '@mediapipe/face_mesh'

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

type BoundingBox = {
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
  visibility: number
}

function distance(a: number[], b: number[]) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))
}

export function drawPath(ctx: CanvasRenderingContext2D, points: number[][], closedPath = false) {
  const region = new Path2D()
  region.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    region.lineTo(point[0], point[1])
    ctx.arc(point[0], point[1], 2.5/* radius */, 0, 2 * Math.PI)
    // ctx.stroke()
    // ctx.fill()
    // ctx.fillText(`${point[2]}`, point[0], point[1])
  }

  if (closedPath) {
    region.closePath()
  }

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
  drawPath(ctx, [
    [box.xMin + w, box.yMin], [box.xMin, box.yMin], [box.xMin, box.yMin + w]
  ])

  drawPath(ctx, [
    [box.xMax - w, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMin + w]
  ])

  drawPath(ctx, [
    [box.xMin, box.yMax - w], [box.xMin, box.yMax], [box.xMin + w, box.yMax]
  ])

  drawPath(ctx, [
    [box.xMax, box.yMax - w], [box.xMax, box.yMax], [box.xMax - w, box.yMax]
  ])
}

export function drawTFFaceResult(ctx: CanvasRenderingContext2D, facePoints: Array<KeyPoint>,
  imgWidth: number, imgHeight: number, triangulateMesh = true, boundingBox = false) {
  if (facePoints == null || facePoints?.length === 0) return
  let box = landmarksToBox(facePoints, imgWidth, imgHeight)
  let keypoints = facePoints.map((point) => [point.x * imgWidth, point.y * imgHeight])
  console.log(keypoints.length)
  if (boundingBox && box != null) {
    drawRectCorner(ctx, box)
  }

  if (triangulateMesh) {
    ctx.strokeStyle = SILVERY
    ctx.lineWidth = 0.5
    for (let i = 0; i < TRIANGULATION.length / 3; i++) {
      const points = [
        TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2],
      ].map((index) => keypoints[index])

      drawPath(ctx, points, true)
    }
  } else {
    ctx.fillStyle = SILVERY
    for (let i = 0; i < NUM_KEYPOINTS; i++) {
      ctx.beginPath()
      ctx.arc(keypoints[i][0], keypoints[i][1], 1.5 /* radius */, 0, 2 * Math.PI)
      ctx.fill()
    }
  }
  
  for (const [label, contour] of Object.entries(FACEMESH_CONTOUR)) {
    ctx.strokeStyle = LABEL_TO_COLOR[label]
    ctx.lineWidth = 2
    let path = contour.map((idx: number) => [...keypoints[idx], idx])
    drawPath(ctx, path, false)
  }
}

export async function drawTFEigenFace(ctx: CanvasRenderingContext2D, eigen: Tensor, scale = 100) {

  let data = await eigen.data()
  ctx.fillStyle = GREEN
  // ctx.strokeStyle = BLUE
  // ctx.lineWidth = 1
  // ctx.rect(0.5, 0.5, 100, 100)
  // ctx.stroke()
  for (let i = 0; i < data.length; i += 2) {
    ctx.beginPath()
    ctx.arc(data[i] * scale, data[i + 1] * scale, 1.5 /* radius */, 0, 2 * Math.PI)
    ctx.fill()
  }
  // ctx.scale(100,100)
}

export function getFaceContour(face: any) {
  const keypoints = face.keypoints.map((p) => [p.x - face.box.xMin, p.y - face.box.yMin])
  return FACEMESH_CONTOUR['faceOval'].map((idx) => keypoints[idx])
}

export function getFaceSlope(face: any) {
  if (face == null) return 0
  const keypoints = face.keypoints.map((p: { x: number, y: number }) => [p.x - face.box.xMin, p.y - face.box.yMin])
  let leftEye = FACEMESH_CONTOUR['leftIris'].map((idx) => keypoints[idx])
  let rightEye = FACEMESH_CONTOUR['rightIris'].map((idx) => keypoints[idx])

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
