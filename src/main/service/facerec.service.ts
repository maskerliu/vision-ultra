
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
    console.log(results)
    return results
  }

  async registe(name: string, vector: any, avatar: File) {
    let fileName = `${avatar.newFilename}${path.extname(avatar.originalFilename)}`
    let dstPath = path.join(USER_DATA_DIR, 'avatar', fileName)
    await fse.ensureDir(path.dirname(dstPath))
    await fse.move(avatar.filepath, dstPath)
    await this.faceRepo.insert(name, vector.split(','), fileName)
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
    let result = await this.faceRepo.search(null, vector)
    console.log(result)
    return name
  }
}

