import * as lancedb from '@lancedb/lancedb'
import { Field, FixedSizeList, Float32, Int64, List, Schema, Utf8, Vector } from 'apache-arrow'
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
      new Field('vector',
        new List(
          new Field("item",
            new FixedSizeList(2, new Field('item', new Float32())
            )
          )
        )
      )
    ])
  }

  private async testTable() {
    const db = await lancedb.connect(path.join(USER_DATA_DIR + '/biz_storage', 'test.db'))
    const data = []
    // generate 512 random multivectors
    for (let i = 0; i < 256; i++) {
      data.push({
        name: 'hello' + i,
        multivector: Array.from({ length: 478 }, () =>
          Array(2).fill(Math.random()),
        ),
      })
    }

    await db.dropAllTables()

    const table = await db.createEmptyTable("multivectors",
      new Schema([
        new Field("name", new Utf8()),
        new Field(
          "multivector",
          new List(
            new Field(
              "item",
              new FixedSizeList(2, new Field("item", new Float32())),
            ),
          ),
        ),
      ])
    )

    await table.add(data)

    const results = await table.search(data[0].multivector).limit(10).toArray()
    await table.createIndex("multivector", {
      config: lancedb.Index.ivfPq({ numPartitions: 2, distanceType: "cosine" }),
    })
    console.log(results)
    const results2 = await table
      .search(data[0].multivector)
      .limit(10)
      .toArray()
    console.log(results2)
  }


  async init() {
    if (this._inited) return

    // await this.testTable()

    this._faceDB = await lancedb.connect(path.join(USER_DATA_DIR + '/biz_storage', 'face.db'))
    let tables = await this._faceDB.tableNames()
    if (tables.indexOf('face') > -1) {
      this._faceTable = await this._faceDB.openTable('face')
    } else {
      this._faceTable = await this._faceDB.createEmptyTable('face', this._schema)
      let idxName = await this._faceTable.indexStats('_nameIdx')
      if (idxName === null) {
        await this._faceTable.createIndex('name', {
          name: '_nameIdx', config: lancedb.Index.btree()
        })
      }

      let idxVector = await this._faceTable.indexStats('_eigenIdx')
      if (idxVector === null) {
        await this._faceTable.createIndex('vector', {
          name: '_eigenIdx',
          config: lancedb.Index.ivfPq({ numPartitions: 2, distanceType: "cosine" })
        })
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

  async delete(ids: Array<string>) {
    await this.init()

    if (ids == null || ids.length == 0) return 'delete success'

    for (let id of ids) {
      await this._faceTable.delete(`_rowId = ${id}`)
    }
    return 'delete success'
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
    let results = await this._faceTable.search(eigen, 'vector', 'vector')
      .limit(4)
      .select(['_rowid', 'name', 'snap', 'timestamp', '_distance'])
      .toArray()
    return results
  }
}

function convertArray(arr: any, size: number) {
  const result: number[][] = []
  for (let i = 0; i < arr.length; i += size) {
    let slice = arr.slice(i, i + size)
    result.push([slice[0], slice[1]])
  }
  return result
}