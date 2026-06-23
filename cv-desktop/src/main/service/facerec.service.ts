
import { File } from 'formidable'
import fse from 'fs-extra'
import { inject, injectable } from "inversify"
import path from 'path'
import { IocTypes, USER_DATA_DIR } from "../MainConst"
import { FaceRecRepo } from '../repository/facerec.repo'

@injectable()
export class FaceRecService {

  @inject(IocTypes.FaceRecRepo)
  private faceRepo: FaceRecRepo

  async list(keyword: string) {
    if (keyword == null) {
      return []
    }
    let results = await this.faceRepo.search(keyword, null)
    let resp = []
    results.forEach((item: any) => {
      let result = {
        id: item._rowid.toString(),
        snap: `/_res/face/${item.snap}`,
        timestamp: item.timestamp.toString()
      }
      resp.push(result)
    })
    return { name: keyword, eigens: resp }
  }

  async registe(name: string, eigen: Uint32Array, avatar: File) {
    let arr = new Float16Array(eigen.length)
    for (let i = 0; i < eigen.length; i++) {
      arr[i] = eigen[i] / 1000000000.0
    }
    if (eigen.length != 478 * 2) {
      throw 'vector length error'
    }
    let fileName = `${avatar.newFilename}${path.extname(avatar.originalFilename)}`
    let dstPath = path.join(USER_DATA_DIR, 'static/face', fileName)
    await fse.ensureDir(path.dirname(dstPath))
    await fse.move(avatar.filepath, dstPath)

    let result = await this.faceRepo.insert(name, arr, fileName)
    if (result !== 'insert success') {
      // 如果数据库插入失败，清理已保存的图片文件
      await fse.remove(dstPath).catch(() => { })
      throw result
    }
    return result
  }

  async delete(eigenIds: Array<string>) {
    try {
      await this.faceRepo.delete(eigenIds)
      return 'name deleted'
    } catch (err) {
      return 'fail to delete data'
    }
  }

  async recognize(vector: Uint32Array) {
    let arr = new Float16Array(vector.length)
    for (let i = 0; i < vector.length; i++) {
      arr[i] = vector[i] / 1000000000.0
    }
    let result = await this.faceRepo.search(null, arr)
    if (result.length > 0) {
      // cosine distance -> similarity percentage (0~2 -> 0%~100%)
      let distance = result[0]._distance ?? 0
      let similarity = Math.max(0, Math.min(1, 1 - distance / 2))
      return {
        id: result[0]._rowid.toString(),
        name: result[0].name,
        snap: `/_res/face/${result[0].snap}`,
        similarity: Math.round(similarity * 100),
        timestamp: result[0].timestamp.toString()
      }
    }

    throw 'no match'
  }
}

