
import { File } from 'formidable'
import fse from 'fs-extra'
import { inject, injectable } from "inversify"
import path from 'path'
import { IocTypes, USER_DATA_DIR } from "../MainConst"
import { FaceRecRepo } from "../repository/facerec.repo"
import { eigenAsync } from '@u4/opencv4nodejs'
import { Timestamp } from 'apache-arrow'

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
        tiemstamp: item.timestamp.toString()
      }
      resp.push(result)
    })
    return { name: keyword, eigens: resp }
  }

  async registe(name: string, eigen: Uint16Array, avatar: File) {
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
    // await this.faceRepo.insert(name, eigen, fileName)
    return name
  }

  async delete(eigenIds: Array<string>) {
    try {
      await this.faceRepo.delete(eigenIds)
      return 'name deleted'
    } catch (err) {
      return 'fail to delete data'
    }
  }

  async recognize(vector: Uint16Array) {
    let arr = new Float16Array(vector.length)
    for (let i = 0; i < vector.length; i++) {
      arr[i] = vector[i] / 1000000000.0
    }
    let result = await this.faceRepo.search(null, arr)
    if (result.length > 0) {
      return {
        id: result[0]._rowid.toString(),
        name: result[0].name,
        snap: `/_res/face/${result[0].snap}`,
        similarity: result[0]._distance,
        timestamp: result[0].timestamp.toString()
      }
    } 
    
    throw 'no match'
  }
}

