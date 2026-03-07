import { injectable } from "inversify"
import path from "path"
import PouchDB from 'pouchdb-node'
import { ModelInfo } from "../../shared"
import { USER_DATA_DIR } from "../MainConst"
import BaseRepo from "./base.repo"

@injectable()
export class ModelRepo extends BaseRepo<ModelInfo> {
  constructor() {
    super()
    this.pouchdb = new PouchDB(path.join(USER_DATA_DIR + '/biz_storage', 'LocalModel.db'))
  }
}