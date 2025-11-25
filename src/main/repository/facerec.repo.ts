import * as lancedb from '@lancedb/lancedb'
import { Field, FixedSizeList, Float16, Schema, Int64, Utf8 } from 'apache-arrow'
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
      new Field('name', new Utf8(), false),
      new Field('snap', new Utf8(), false),
      new Field('timestamp', new Int64(), false),
      new Field('vector', new FixedSizeList(478,
        new Field("item", new FixedSizeList(2, new Field('item', new Float16(), false)), false),
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
        await this._faceTable.createIndex('name', { name: '_nameIdx', config: lancedb.Index.btree() })
      }
    }

    console.log('face repo init')

    this._inited = true
  }

  async insert(name: string, vector: number[], snap: string) {
    await this.init()
    let curCount = 0
    try {
      curCount = (await this._faceTable.query().where(`name = '${name}'`).select('_rowid').toArray()).length
    } catch (err) {
      console.log(err)
      return 'db error'
    }

    if (curCount > 4) {
      return 'name already exists'
    }
    let eigen = convertArray(vector, 2)
    await this._faceTable.add([{ name: name, vector: eigen, snap: snap, timestamp: Date.now() }])
    return 'update success'
  }

  async delete(name: string, id: string) {
    if (name != null) {
      await this._faceTable.delete(`name = '${name}'`)
      return 'delete success'
    }
    if (id != null) {
      await this._faceTable.delete(`_rowId = ${id}`)
      return 'delete success'
    }
  }

  async search(keyword: string, vector: any) {
    await this.init()

    if (keyword != null) {
      let results = await this._faceTable.query().limit(4)
        .where(`name = '${keyword}'`)
        .select(['_rowid', 'name', 'snap', 'timestamp'])
        .toArray()
      return results
    }


    let eigen = convertArray(vector, 2)
    let results = await this._faceTable.query().limit(4)
      .nearestTo(eigen)
      .distanceType('dot')
      .column('vector')
      .toArray()
    console.log(results)
  }
}

function convertArray(arr: any, size: number) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    let slice = arr.slice(i, i + size)
    Uint16Array.from(slice)
    result.push([slice[0], slice[1]])
  }
  return result
}