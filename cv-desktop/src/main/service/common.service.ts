import { app, nativeTheme } from 'electron'
import { inject, injectable } from "inversify"
import { accessSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'path'
import { BizConfig, CommonApi } from '../../shared'
import { IocTypes, Lynx_Mqtt_Broker, USER_DATA_DIR } from '../MainConst'
import { getLocalIPs } from '../misc/utils'
import { ModelRepo } from '../repository/model.repo'
import { PushService } from './push.service'

@injectable()
export class CommonService {

  private _mixConfig: BizConfig

  @inject(IocTypes.ModelRepo)
  private _modelRepo: ModelRepo

  get allConfig() {
    return this._mixConfig
  }

  set allConfig(config: BizConfig) {
    this._mixConfig = config
  }

  @inject(IocTypes.PushService)
  private pushService: PushService

  constructor() {
    let filePath = path.join(USER_DATA_DIR, 'local.config.json')

    try {
      accessSync(filePath)
    } catch (err) {
      console.log('file not exist')
      writeFileSync(filePath, process.env.BUILD_CONFIG, 'utf-8')
    } finally {
      let data = readFileSync(filePath, 'utf-8')
      let config = JSON.parse(data)
      this.allConfig = {
        appVersion: app.getVersion(),
        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
        locales: app.getLocale(),
        platform: process.platform,
        arch: process.arch,
        updateServer: config.updateServer,
        protocol: config.protocol ? config.protocol : 'http',
        ip: getLocalIPs()[0]?.address,
        port: config.port ? config.port : 8884,
        portValid: config.portValid,
        domain: config.domain,
        ips: getLocalIPs(),
        modelPath: config.modelPath,
        mqttBroker: Lynx_Mqtt_Broker
      }
    }
  }


  public register(uid: string) {
    if (uid != null) {
      let data: CommonApi.PushMsg<any> = {
        type: CommonApi.PushMsgType.CMD,
        payload: {
          type: CommonApi.CMDType.REGISTER,
          content: uid
        }
      }
      this.pushService.sendMessage(uid, data)
      return '注册成功'
    } else {
      throw 'invalid uid'
    }
  }

  getAllConfig(): BizConfig {
    console.log('get all config')
    return this._mixConfig
  }

  saveAllConfig(config: BizConfig) {
    let filePath = path.join(USER_DATA_DIR, 'local.config.json')
    try {
      accessSync(filePath)
    } catch (err) {
      console.log('file not exist')
    } finally {
      this.allConfig.updateServer = config.updateServer
      this.allConfig.domain = config.domain
      this.allConfig.port = Number.parseInt(config.port as any)
      this.allConfig.portValid = config.portValid as boolean
      this.allConfig.ip = config.ip
      this.allConfig.protocol = config.protocol
      this.allConfig.modelPath = config.modelPath
      writeFileSync(filePath, JSON.stringify(this.allConfig), 'utf-8')
    }
  }

  async getLocalModels() {
    if (this.allConfig.modelPath == null) return []
    let files = readdirSync(this.allConfig.modelPath)
    let names: string[] = []
    files.forEach(file => {
      const filePath = path.join(this.allConfig.modelPath, file)
      const stat = statSync(filePath)
      let name = null
      if (stat.isFile()) {
        name = path.parse(filePath).name
      } else if (stat.isDirectory()) {
        name = file
      }

      if (names.indexOf(name) == -1) names.push(name)
    })

    let modelInDb = await this._modelRepo.search()
    if (modelInDb != null && modelInDb.length == names.length) return modelInDb

    for (let model of modelInDb) {
      if (names.indexOf(model.name) == -1) {
        await this._modelRepo.delete(model._id)
      }
    }

    return names
  }
}