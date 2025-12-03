
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

  async registe(name: string, eigen: Float16Array, avatar: File) {
    console.log('eigen', eigen)
    // let arr = eigen.split(',').map((item: string) => {
    //   return Number(item)
    // })
    if (eigen.length != 478 * 3) {
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

  async recognize(vector: any) {
    let name = 'unknown'
    let arr = vector.split(',').map((item: string) => {
      return Number(item)
    })
    let result = await this.faceRepo.search(null, arr)
    if (result.length > 0) {
      return {
        id: result[0]._rowid.toString(),
        name: result[0].name,
        snap: `/_res/face/${result[0].snap}`,
        similarity: result[0]._distance,
        timestamp: result[0].timestamp.toString()
      }
    } else {
      return null
    }
  }
}

