import { injectable } from "inversify"
import path from 'path'
import PouchFind from 'pouchdb-find'
import PouchDB from 'pouchdb-node'
import "reflect-metadata"
import { ProxyMock } from '../../common/proxy.api'
import { USER_DATA_DIR } from '../MainConst'
import BaseRepo from './base.repo'

PouchDB.plugin(PouchFind)


@injectable()
export class FaceRecRepo extends BaseRepo<ProxyMock.MockRule> {

  constructor() {
    super()
    this.pouchdb = new PouchDB(path.join(USER_DATA_DIR + '/biz_storage', 'Mock.Rules'))
  }
}