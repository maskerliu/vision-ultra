
import { File } from 'formidable'
import { inject, injectable } from "inversify"
import { APP_DATA_DIR, IocTypes, USER_DATA_DIR } from "../MainConst"
import fse from 'fs-extra'
import { FaceRecRepo } from "../repository/facerec.repo"
import path from 'path'

@injectable()
export class FaceRecService {

  @inject(IocTypes.FaceRecRepo)
  private faceRepo: FaceRecRepo

  async list() {
    // await this.faceRepo.list()

    return []
  }

  async registe(name: string, vector: any, avatar: File) {
    let fileName = `${avatar.newFilename}${path.extname(avatar.originalFilename)}`
    let dstPath = path.join(USER_DATA_DIR, 'avatar', fileName)
    console.log(path.dirname(dstPath))
    await fse.ensureDir(path.dirname(dstPath))
    await fse.move(avatar.filepath, dstPath)
    this.faceRepo.insert(name, vector, fileName)
    return name
  }

  async delete(name: string, vectorId: string) {

    if (name == null) {

    }

    if (vectorId == null) {

    }
  }

  async recognize(vector: any) {
    let name = 'chris'
    await this.faceRepo.search(vector)
    return name
  }
}