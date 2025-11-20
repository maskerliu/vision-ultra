
import { inject, injectable } from "inversify"
import { FaceRecRepo } from "../repository/facerec.repo"
import { IocTypes } from "../MainConst"

@injectable()
export class FaceRecService {

  @inject(IocTypes.FaceRecRepo)
  private faceRepo: FaceRecRepo

  async list() {
    // await this.faceRepo.list()

    return []
  }

  async registe(name: string, vector: any, img: ImageData) {

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