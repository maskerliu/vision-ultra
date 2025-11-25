
import { File } from 'formidable'
import { inject, injectable } from "inversify"
import { APP_DATA_DIR, IocTypes, USER_DATA_DIR } from "../MainConst"
import fse from 'fs-extra'
import { FaceRecRepo } from "../repository/facerec.repo"
import path from 'path'
import { init } from 'ace-builds/src-noconflict/ext-keybinding_menu'

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
        name: item.name,
        snap: `_res/face/${item.snap}`,
        tiemstamp: item.timestamp.toString()
      }
      resp.push(result)
    })
    console.log(resp)
    return resp
  }

  async registe(name: string, vector: any, avatar: File) {
    let arr = vector.split(',').map((item: string) => {
      return Number(item)
    })
    if (arr.length != 478 * 2) {
      return 'vector length error'
    }
    let fileName = `${avatar.newFilename}${path.extname(avatar.originalFilename)}`
    let dstPath = path.join(USER_DATA_DIR, 'static/face', fileName)
    await fse.ensureDir(path.dirname(dstPath))
    await fse.move(avatar.filepath, dstPath)
    await this.faceRepo.insert(name, arr, fileName)
    return name
  }

  async delete(name: string, vectorId: string) {
    try {
      await this.faceRepo.delete(name, vectorId)
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
    console.log(result)
    return name
  }
}

