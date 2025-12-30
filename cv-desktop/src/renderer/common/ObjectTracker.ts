import * as tf from '@tensorflow/tfjs'
import { ModelType, TFModel } from './TFModel'

export const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {
  private _detectModel: TFModel = new TFModel()
  private _segmentModel: TFModel = new TFModel()

  public objNum: number = 0
  get scale() {
    return this._detectModel.scale
  }

  public boxes: Float16Array<ArrayBufferLike> = new Float16Array(MAX_OBJECTS_NUM * 4)
  public scores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  public classes: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  public sgData: Float32Array

  private nms: tf.Tensor
  private boxesTF: tf.Tensor
  private scoresTF: tf.Tensor
  private classesTF: tf.Tensor

  private _expire: number = 0
  get expire(): number { return this._expire }

  async init(detectModel: string = 'yolov8n', segmentModel: string = null) {
    await this._detectModel.init(detectModel, ModelType.Detect)
    await this._segmentModel.init(segmentModel, ModelType.Segment)
  }

  dispose(types: ModelType[]) {
    if (types.includes(ModelType.Segment))
      this._segmentModel?.dispose()

    if (types.includes(ModelType.Detect))
      this._detectModel?.dispose()
  }

  async detect(image: ImageData) {
    if (this._detectModel?.isInited === false) return
    let time = Date.now()
    tf.engine().startScope()
    let res = await this._detectModel.run(image)

    switch (this._detectModel.name) {
      case 'yolov8n':
      case 'yolo11n':
        await this.yoyoCommon(res as tf.Tensor)
        break
      case 'yolov10n':
        await this.yolov10n(res as tf.Tensor[])
        break
      case 'mobilenet':
        await this.mobilenetv2(res as tf.Tensor[], image.width, image.height)
        break
      default:
        console.log('no match model find!!')
        return
    }

    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxesTF as any, this.scoresTF as any, 50, 0.45, 0.35)
    if (this.nms.size > MAX_OBJECTS_NUM && !this.nms.isDisposed) {
      let tmp = this.nms.slice(0, MAX_OBJECTS_NUM)
      this.nms.dispose()
      this.nms = tmp
    }

    // if (!this.boxesTF?.isDisposed) this.boxesTF?.print()
    // if (!this.scoresTF?.isDisposed) {
    //   console.log('scores', this.scoresTF?.dataSync())
    // }
    // if (!this.classesTF?.isDisposed) {
    //   console.log('classes', this.classesTF?.dataSync())
    // }
    // if (!this.nms?.isDisposed) {
    //   console.log('nms', this.nms?.dataSync())
    // }

    tf.tidy(() => {
      if (this.boxesTF?.isDisposed || this.nms?.isDisposed || this.scoresTF?.isDisposed || this.classesTF?.isDisposed || this.nms?.size == 0) return
      this.objNum = Math.min(this.nms?.size, MAX_OBJECTS_NUM)
      this.boxes.set(this.boxesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(this.scoresTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum))
      this.classes.set(this.classesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum))
      return
    })

    tf.dispose([res, this.boxesTF, this.scoresTF, this.classesTF, this.nms])
    tf.engine().endScope()

    this._expire = Date.now() - time
  }

  async segment(image: ImageData) {
    if (this._segmentModel?.isInited === false) return
    let result = await this._segmentModel.run(image, true) as tf.Tensor
    let [height, width] = result.shape.slice(1)

    switch (this._segmentModel.name) {
      case 'deeplab':
        let data = await result.squeeze().data()
        result.dispose()
        return { mask: data, width, height }
      case 'yolo11n-seg':
        return this.yolo11nSegment(result)
      default:
        console.log('no match model find!!')
        return
    }
  }

  private async yolov10n(res: tf.Tensor[]) {
    let x1 = res[1].slice([0, 0, 0], [-1, -1, 1])// x1
    let y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
    let x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
    let y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
    this.scoresTF = tf.tidy(() => res[1].slice([0, 0, 4], [-1, -1, 1]).squeeze())
    this.classesTF = tf.tidy(() => res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze())
    this.boxesTF = tf.tidy(() => tf.concat([y1, x1, y2, x2,], 2).squeeze())
    tf.dispose([x1, y1, x2, y2])
  }

  private async yoyoCommon(res: tf.Tensor) {
    const transRes = res.transpose([0, 2, 1])
    this.boxesTF = tf.tidy(() => {
      const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
      const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
      const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)) // x1
      const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)) // y1
      return tf
        .concat([y1, x1, tf.add(y1, h), tf.add(x1, w),], 2)
        .squeeze()
    })

    const rawScores = tf.tidy(() => transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze())
    this.scoresTF = rawScores.max(1)
    this.classesTF = rawScores.argMax(1)
    rawScores.dispose()
    transRes.dispose()
  }

  private async mobilenetv2(res: tf.Tensor[], width: number, height: number) {
    this.scoresTF = tf.tidy(() => res[0].max(2).squeeze())
    this.classesTF = tf.tidy(() => res[0].argMax(2).add(1).squeeze())
    let transRes = tf.tidy(() => res[1].squeeze())
    let y1 = tf.tidy(() => res[1].slice([0, 0, 0, 0], [-1, -1, -1, 1]).mul(height)) // y1
    let x1 = tf.tidy(() => res[1].slice([0, 0, 0, 1], [-1, -1, -1, 1]).mul(width)) // x1
    let y2 = tf.tidy(() => res[1].slice([0, 0, 0, 2], [-1, -1, -1, 1]).mul(height)) // y2
    let x2 = tf.tidy(() => res[1].slice([0, 0, 0, 3], [-1, -1, -1, 1]).mul(width)) // x2
    this.boxesTF = tf.tidy(() => tf.concat([y1, x1, y2, x2,], 2).squeeze())
    tf.dispose([transRes, x1, y1, x2, y2])
  }

  private async deeplabSegment(res: tf.Tensor) {
    const [height, width] = res.shape
    const segmentationImageBuffer = tf.buffer([height, width, 3], 'int32')
    const mapData = await res.array()
    const arrData = await res.data()
    for (let col = 0; col < height; ++col) {
      for (let row = 0; row < width; ++row) {
        const label = mapData[col][row]
        if (label == undefined) console.log('undefined', col, row)

        let item = arrData[col * width + row]
        if (item == undefined) console.log('undefined', col, row)
      }
    }


    const segmentationImageTensor =
      segmentationImageBuffer.toTensor() as tf.Tensor3D

    const segmentationMap =
      await tf.browser.toPixels(segmentationImageTensor)
    tf.dispose(segmentationImageTensor)

    return segmentationMap
  }

  private async yolo11nSegment(res: tf.Tensor) {
    const [modelHeight, modelWidth] = this._segmentModel.inShape // get model width and height
    const [modelSegHeight, modelSegWidth, modelSegChannel] = res[1].shape.slice(1)
    const [xRatio, yRatio] = this._segmentModel.scale

    console.log(modelHeight, modelWidth, modelSegHeight, modelSegWidth, modelSegChannel, xRatio, yRatio)

    const transRes = tf.tidy(() => res[0].transpose([0, 2, 1]).squeeze()) // transpose main result
    const transSegMask = tf.tidy(() => res[1].transpose([0, 3, 1, 2]).squeeze()) // transpose segmentation mask result

    const boxes = tf.tidy(() => {
      const w = transRes.slice([0, 2], [-1, 1])
      const h = transRes.slice([0, 3], [-1, 1])
      const x1 = tf.sub(transRes.slice([0, 0], [-1, 1]), tf.div(w, 2)) //x1
      const y1 = tf.sub(transRes.slice([0, 1], [-1, 1]), tf.div(h, 2)) //y1
      return tf.concat(
        [y1, x1,
          tf.add(y1, h), //y2
          tf.add(x1, w), //x2
        ], 1
      ).squeeze() // [n, 4]
    }) // get boxes [y1, x1, y2, x2]

    const [scores, classes] = tf.tidy(() => {
      const rawScores = transRes.slice([0, 4], [-1, 80]).squeeze() // [n, 1]
      return [rawScores.max(1), rawScores.argMax(1)]
    }) // get scores and classes

    const nms = await tf.image.nonMaxSuppressionAsync(boxes as any, scores, 50, 0.45, 0.2) // do nms to filter boxes
    const detReady = tf.tidy(() =>
      tf.concat(
        [
          boxes.gather(nms, 0),
          scores.gather(nms, 0).expandDims(1),
          classes.gather(nms, 0).expandDims(1),
        ],
        1 // axis
      )
    ) // indexing selected boxes, scores and classes from NMS result
    const masks = tf.tidy(() => {
      const sliced = transRes.slice([0, 4 + 80], [-1, modelSegChannel]).squeeze() // slice mask from every detection [m, mask_size]
      return sliced
        .gather(nms, 0) // get selected mask from NMS result
        .matMul(transSegMask.reshape([modelSegChannel, -1])) // matmul mask with segmentation mask result [n, mask_size] x [mask_size, h x w] => [n, h x w]
        .reshape([nms.shape[0], modelSegHeight, modelSegWidth]) // reshape back [n, h x w] => [n, h, w]
    }) // processing mask

    console.log(masks)
    masks.print()

    const toDraw = [] // list boxes to draw
    let overlay = tf.zeros([modelHeight, modelWidth, 4]) // initialize overlay to draw mask

    for (let i = 0; i < detReady.shape[0]; i++) {
      const rowData = detReady.slice([i, 0], [1, 6]) // get every first 6 element from every row
      let [y1, x1, y2, x2, score, label] = rowData.dataSync() // [y1, x1, y2, x2, score, label]
      // const color = colors.get(label) // get label color

      const downSampleBox = [
        Math.floor((y1 * modelSegHeight) / modelHeight), // y
        Math.floor((x1 * modelSegWidth) / modelWidth), // x
        Math.round(((y2 - y1) * modelSegHeight) / modelHeight), // h
        Math.round(((x2 - x1) * modelSegWidth) / modelWidth), // w
      ] // downsampled box (box ratio at model output)
      const upSampleBox = [
        Math.floor(y1 * yRatio), // y
        Math.floor(x1 * xRatio), // x
        Math.round((y2 - y1) * yRatio), // h
        Math.round((x2 - x1) * xRatio), // w
      ] // upsampled box (box ratio to draw)

      const proto = tf.tidy(() => {
        const sliced = masks.slice(
          [
            i,
            downSampleBox[0] >= 0 ? downSampleBox[0] : 0,
            downSampleBox[1] >= 0 ? downSampleBox[1] : 0,
          ],
          [
            1,
            downSampleBox[0] + downSampleBox[2] <= modelSegHeight
              ? downSampleBox[2]
              : modelSegHeight - downSampleBox[0],
            downSampleBox[1] + downSampleBox[3] <= modelSegWidth
              ? downSampleBox[3]
              : modelSegWidth - downSampleBox[1],
          ]
        ) // coordinate to slice mask from proto
        return sliced.squeeze().expandDims(-1) // sliced proto [h, w, 1]
      })
      const upsampleProto = tf.image.resizeBilinear(proto, [upSampleBox[2], upSampleBox[3]]) // resizing proto to drawing size
      const mask = tf.tidy(() => {
        const padded = upsampleProto.pad([
          [upSampleBox[0], modelHeight - (upSampleBox[0] + upSampleBox[2])],
          [upSampleBox[1], modelWidth - (upSampleBox[1] + upSampleBox[3])],
          [0, 0],
        ]) // padding proto to canvas size
        return padded.less(0.5) // make boolean mask from proto to indexing overlay
      }) // final boolean mask

      // console.log(mask)
      // mask.print()
      // overlay = tf.tidy(() => {
      //   const newOverlay = overlay.where(mask, [...Colors.hexToRgba(color), 150]) // indexing overlay from mask with RGBA code
      //   overlay.dispose() // dispose old overlay tensor (free memory)
      //   return newOverlay // return new overlay
      // }) // new overlay

      tf.dispose([rowData, proto, upsampleProto, mask]) // dispose unused tensor to free memory
    }

    return await overlay.data()
  }

}