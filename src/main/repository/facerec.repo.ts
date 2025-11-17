import * as lancedb from '@lancedb/lancedb'
import { injectable } from "inversify"
import path from 'path'
import PouchDB from 'pouchdb-node'
import "reflect-metadata"
import { ProxyMock } from '../../common/proxy.api'
import { USER_DATA_DIR } from '../MainConst'
import BaseRepo from './base.repo'



const facedb = await lancedb.connect(path.join(USER_DATA_DIR + '/biz_storage', 'face.db'))
const faceTable = await facedb.createTable('face', [])

@injectable()
export class FaceRecRepo extends BaseRepo<ProxyMock.MockRule> {

  constructor() {
    super()
  }

  async findFace(faceVector: [number]) {
    return await faceTable.vectorSearch(faceVector).limit(20).toArray()
  }
}