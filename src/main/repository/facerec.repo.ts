import * as lancedb from '@lancedb/lancedb'
import { Data, Field, FixedSizeList, Float16, Schema, Utf8 } from 'apache-arrow'
import { injectable } from "inversify"
import path from 'path'
import "reflect-metadata"
import { USER_DATA_DIR } from '../MainConst'

@injectable()
export class FaceRecRepo {
  private _faceDB: lancedb.Connection
  private _faceTable: lancedb.Table
  private _schema: lancedb.SchemaLike

  private _inited: boolean = false

  constructor() {
    this._schema = new Schema([
      new Field('id', new Utf8(), false),
      new Field('name', new Utf8(), false),
      new Field('vector', new FixedSizeList(478,
        new Field("item", new FixedSizeList(3, new Field('item', new Float16(), false)), false),
      ), false)
    ])
  }

  async init() {
    if (this._inited) return

    this._faceDB = await lancedb.connect(path.join(USER_DATA_DIR + '/biz_storage', 'face.db'))
    let tables = await this._faceDB.tableNames()
    if (tables.indexOf('face') > -1) {
      this._faceTable = await this._faceDB.openTable('face')
    } else {
      this._faceTable = await this._faceDB.createEmptyTable('face', this._schema)
      let idxStat = await this._faceTable.indexStats('_nameIdx')
      if (idxStat === null) {
        await this._faceTable.createIndex('name', { name: '_nameIdx' })
      }
    }

    console.log('face repo init')

    const results = await this._faceTable.vectorSearch([0.1, 0.3]).limit(20).toArray()
    console.log(results)
    this._inited = true
  }

  async insert(name: string, vector: number[], snap: string) {
    await this.init()
    // let data = new Data()
    // await this._faceTable.add({ vector, name , snap})
  }

  async search(faceVector: [number]) {
    await this.init()

    let results = await this._faceTable.vectorSearch(faceVector).limit(20).toArray()
    // return await faceTable.vectorSearch(faceVector).limit(20).toArray()
  }
}