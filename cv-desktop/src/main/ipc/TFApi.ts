
// require('@mediapipe/tasks-vision/wasm/vision_wasm_internal.js')
// import '@mediapipe/tasks-vision/wasm/vision_wasm_internal.js'
// import { FaceLandmarksDetector, SupportedModels, createDetector, Face } from '@tensorflow-models/face-landmarks-detection'
// import { FaceMesh, VERSION } from '@mediapipe/face_mesh'
// import * as loader from '@mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin'
import { ITensorflowApi } from '../../common/ipc.api'
// import path from 'path'
// import { readFile } from 'node:fs/promises'
// import { WASI } from 'node:wasi'

// import * as tf from '@tensorflow/tfjs-node'
// import '@tensorflow/tfjs-node'

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

// let sharedData: Uint8ClampedArray
// let faceDetector: FaceLandmarksDetector


let tfApi: ITensorflowApi = {
  async init(backend: 'mediapipe-gpu' | 'tfjs-webgl'): Promise<void> {
    // console.log(`init tf: \t faceMesh[${VERSION}]`)
    // const faceMesh = new FaceMesh({
    //   locateFile: (file) => {
    //     return path.join(__dirname, `../../node_modules/@mediapipe/face_mesh/${file}`)
    //   }
    // })
    // await faceMesh.initialize()

    // console.log(window)

    // const vision = await FilesetResolver.forVisionTasks(
    //  path.join(__dirname,  '../../node_modules/@mediapipe/tasks-vision/wasm')
    // )

    // const landmarker = await FaceLandmarker.createFromOptions(vision, {
    //   baseOptions: {
    //     modelAssetPath: path.join(__dirname, '../../data/face_landmarker.task'), // 官方模型 6.5 MB
    //     delegate: 'CPU'
    //   },
    //   runningMode: 'IMAGE',
    //   numFaces: 1
    // })
    // const runtime = backend.split('-')[0]
    // if (runtime === 'mediapipe') {
    //   faceDetector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
    //     runtime,
    //     refineLandmarks: true,
    //     maxFaces: 1,
    //     solutionPath: path.join(__dirname, `../../node_modules/@mediapipe/face_mesh`)
    //   });
    // } else if (runtime === 'tfjs') {
    //   faceDetector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
    //     runtime, refineLandmarks: true, maxFaces: 1,
    //   })
    // }
  },
  destroy(): void {
    // faceDetector?.dispose()
    // faceDetector = null
  },
  async detect(frame: ImageData): Promise<any[]> {
    // try {
    //   return await faceDetector.estimateFaces(frame, { flipHorizontal: true })
    // } catch (e) {
    //   console.error(e)
    //   faceDetector.dispose()
    //   faceDetector = null
    // }
    return null
  }

}

export default tfApi