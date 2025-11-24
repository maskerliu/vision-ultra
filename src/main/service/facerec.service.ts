
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
    let arr = vector.split(',').map((item: string) => {
      return Number(item)
    })
    let fileName = `${avatar.newFilename}${path.extname(avatar.originalFilename)}`
    let dstPath = path.join(USER_DATA_DIR, 'avatar', fileName)
    await fse.ensureDir(path.dirname(dstPath))
    await fse.move(avatar.filepath, dstPath)
    await this.faceRepo.insert(name, convert2DArray(arr, 2), fileName)
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
    let arr = vector.split(',').map((item: string) => {
      return Number(item)
    })
    let result = await this.faceRepo.search(convert2DArray(arr, 2))
    console.log(result)
    return name
  }
}

function convert2DArray(arr: any, size: number) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}