import * as lancedb from '@lancedb/lancedb'
import { Field, FixedSizeList, Float32, Int64, Schema, Utf8 } from 'apache-arrow'
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
    // 478个关键点，每个点2维坐标（x, y）→ 956维向量
    // 使用 FixedSizeList(956, Float32) 存储展平后的向量
    this._schema = new Schema([
      new Field('name', new Utf8(), false),
      new Field('snap', new Utf8(), false),
      new Field('timestamp', new Int64(), false),
      new Field('vector', new FixedSizeList(956, new Field('item', new Float32(), true)), false)
    ])
  }

  async init() {
    if (this._inited) return

    this._faceDB = await lancedb.connect(path.join(USER_DATA_DIR, 'biz_storage', 'face.db'))
    let tables = await this._faceDB.tableNames()
    if (tables.indexOf('face') > -1) {
      this._faceTable = await this._faceDB.openTable('face')
    } else {
      this._faceTable = await this._faceDB.createEmptyTable('face', this._schema)
    }

    // 确保标量索引存在（name 字段）用于按名过滤
    try {
      let nameIdxStats = await this._faceTable.indexStats('name_idx')
      if (nameIdxStats == null) {
        await this._faceTable.createIndex('name', { config: lancedb.Index.btree() })
      }
    } catch (err) {
      console.log('name index check/create', err)
    }

    // 确保向量索引存在（vector 字段）用于相似度搜索
    try {
      let vecIdxStats = await this._faceTable.indexStats('vector_idx')
      if (vecIdxStats == null) {
        await this._faceTable.createIndex('vector', {
          config: lancedb.Index.ivfPq({ numPartitions: 2, distanceType: "cosine" })
        })
      }
    } catch (err) {
      console.log('vector index check/create', err)
    }

    console.log('face repo init')
    this._inited = true
  }

  async insert(name: string, vector: Float16Array, snap: string) {
    await this.init()
    let curCount = 0
    try {
      // 使用 countRows 替代 query + length，更高效且安全（避免 SQL 注入）
      curCount = await this._faceTable.countRows(`name = '${name.replace(/'/g, "''")}'`)
    } catch (err) {
      console.log('countRows error', err)
      return 'db error'
    }

    if (curCount >= 5) {
      return 'name already exists (max 5 entries)'
    }
    await this._faceTable.add([{ name: name, vector: Array.from(vector), snap: snap, timestamp: Date.now() }])
    return 'insert success'
  }

  async delete(ids: Array<string>) {
    await this.init()

    if (ids == null || ids.length == 0) return 'delete success'

    // LanceDB 使用 _rowid（小写）作为内置行 ID
    // 批量删除：构造 IN 谓词，一次删除
    const rowIds = ids.map(id => Number(id)).filter(n => !isNaN(n))
    if (rowIds.length === 0) return 'delete success'

    if (rowIds.length === 1) {
      await this._faceTable.delete(`_rowid = ${rowIds[0]}`)
    } else {
      const predicate = `_rowid IN (${rowIds.join(', ')})`
      await this._faceTable.delete(predicate)
    }
    return 'delete success'
  }

  async search(keyword: string, vector: Float16Array) {
    await this.init()

    if (keyword != null && keyword.trim() !== '') {
      // 按名称精确查询（使用标量索引）
      let results = await this._faceTable.query()
        .limit(5)
        .where(`name = '${keyword.replace(/'/g, "''")}'`)
        .select(['_rowid', 'name', 'snap', 'timestamp'])
        .toArray()
      return results
    }

    if (vector == null || vector.length === 0) {
      return []
    }

    // 向量相似度搜索（使用 query().nearestTo() 替代旧版 search API）
    let results = await this._faceTable.query()
      .nearestTo(Array.from(vector))
      .column('vector')
      .distanceType('cosine')
      .limit(5)
      .select(['_rowid', 'name', 'snap', 'timestamp', '_distance'])
      .toArray()
    return results
  }
}
