
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { Face } from "@tensorflow-models/face-landmarks-detection"
import { TRIANGULATION } from "./Triangulation"

export const NUM_KEYPOINTS = 468
export const NUM_IRIS_KEYPOINTS = 5
export const GREEN = '#32EEDB'
export const RED = '#FF2C35'
export const BLUE = '#157AB3'
export const YELLOW = '#F8E16C'
export const WHITE = '#FFFFFF'
export const SILVERY = '#E0E0E0'
export const PURPLE = '#7F00FF'

export const VIDEO_SIZE = {
  '640 X 480': { width: 640, height: 480 },
  '640 X 360': { width: 640, height: 360 },
  '360 X 270': { width: 360, height: 270 }
}

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

const FaceContours = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh)

function distance(a: number[], b: number[]) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))
}

export function drawPath(ctx: CanvasRenderingContext2D, points: number[][], closedPath = false) {
  const region = new Path2D()
  region.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    region.lineTo(point[0], point[1])
  }

  if (closedPath) {
    region.closePath()
  }

  ctx.stroke(region)
}


export function drawMutliLine(context: CanvasRenderingContext2D,
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

export function drawTFFaceResult(ctx: CanvasRenderingContext2D, faces: Face[],
  triangulateMesh = true, boundingBox = false) {
  if (faces == null || faces.length === 0) return
  faces.forEach((face: any) => {
    const keypoints = face.keypoints.map((keypoint) => [keypoint.x, keypoint.y])
    if (boundingBox) {
      ctx.strokeStyle = SILVERY
      ctx.lineWidth = 5

      const box = face.box
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

    if (triangulateMesh) {
      ctx.strokeStyle = GREEN
      ctx.lineWidth = 0.5
      for (let i = 0; i < TRIANGULATION.length / 3; i++) {
        const points = [
          TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2],
        ].map((index) => keypoints[index])

        drawPath(ctx, points, true)
      }
    } else {
      ctx.strokeStyle = GREEN

      for (let i = 0; i < NUM_KEYPOINTS; i++) {
        ctx.beginPath()
        ctx.arc(keypoints[i][0], keypoints[i][1], 1 /* radius */, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    if (keypoints.length > NUM_KEYPOINTS) {
      ctx.strokeStyle = RED
      ctx.lineWidth = 2

      const leftCenter = keypoints[NUM_KEYPOINTS]
      const leftDiameterY = distance(keypoints[NUM_KEYPOINTS + 4], keypoints[NUM_KEYPOINTS + 2])
      const leftDiameterX = distance(keypoints[NUM_KEYPOINTS + 3], keypoints[NUM_KEYPOINTS + 1])
      ctx.beginPath()
      ctx.ellipse(leftCenter[0], leftCenter[1], leftDiameterX / 2, leftDiameterY / 2, 0, 0, 2 * Math.PI)
      ctx.stroke()

      if (keypoints.length > NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS) {
        const rightCenter = keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS]
        const rightDiameterY = distance(keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 2],
          keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 4])
        const rightDiameterX = distance(keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 3],
          keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 1])

        ctx.beginPath()
        ctx.ellipse(rightCenter[0], rightCenter[1], rightDiameterX / 2, rightDiameterY / 2, 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }

    for (const [label, contour] of Object.entries(FaceContours)) {
      ctx.strokeStyle = LABEL_TO_COLOR[label]
      ctx.lineWidth = 2
      const path = contour.map((index) => keypoints[index])
      if (path.every(value => value != undefined)) {
        drawPath(ctx, path, false)
      }
    }
  })
}

export function getFaceContour(face: Face) {
  const keypoints = face.keypoints.map((keypoint) => [keypoint.x - face.box.xMin, keypoint.y - face.box.yMin])
  return FaceContours['faceOval'].map((index) => keypoints[index])
}

export function getFaceSlope(face: Face) {
  if (face == null) return 0
  const keypoints = face.keypoints.map((keypoint) => [keypoint.x - face.box.xMin, keypoint.y - face.box.yMin])
  let leftEye = FaceContours['leftIris'].map((index) => keypoints[index])
  let rightEye = FaceContours['rightIris'].map((index) => keypoints[index])

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