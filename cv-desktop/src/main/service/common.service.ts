import { app, nativeTheme } from 'electron'
import { inject, injectable } from "inversify"
import { accessSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'path'
import { BizConfig, CommonApi, ModelInfo, ModelType } from '../../shared'
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
    const validExts = ['.onnx', '.json', '.tflite', '.bin', '.task']
    if (this.allConfig.modelPath == null) return []
    let files = readdirSync(this.allConfig.modelPath)
    let names: string[] = []
    files.forEach(file => {
      const filePath = path.join(this.allConfig.modelPath, file)
      const stat = statSync(filePath)
      let name = null
      if (stat.isFile()) {
        let ext = path.parse(filePath).ext
        if (validExts.indexOf(ext) != -1) {
          name = path.parse(filePath).name
        } else {
          // console.log('invalid ext', ext)
        }
      } else if (stat.isDirectory()) {
        name = file
      }

      if (names.indexOf(name) == -1) names.push(name)
    })

    let result = await this._modelRepo.search()

    let dbModels = result.map(item => item.name)
    let deleteModels = result.filter(item => names.indexOf(item.name) == -1 && item.name != null)
    let newModels = names.filter(item => dbModels.indexOf(item) == -1 && item != null)

    if (deleteModels.length == 0 && newModels.length == 0) {
      console.log('no models to delete or add')
      return result
    }

    // 删除本地不存在的模型
    if (deleteModels.length > 0) {
      deleteModels.forEach(item => item._deleted = true)
      console.log('delete models', deleteModels)
      await this._modelRepo.bulkUpdate(deleteModels)
    }

    // 添加新模型到数据库
    if (newModels.length > 0) {
      let models = newModels.map(name => ({ name, type: ModelType.unknown, } as ModelInfo))
      console.log('add new models', models)
      await this._modelRepo.bulkUpdate(models)
    }

    result = await this._modelRepo.search()
    return result
  }

  async updateModelInfo(model: ModelInfo) {
    try {
      await this._modelRepo.update(model)
      return '更新成功'
    } catch (err) {
      console.log('update model error', err)
      return '更新失败'
    }
  }

  async deleteModel(modelId: string) {
    try {
      await this._modelRepo.delete(modelId)
      return '删除成功'
    } catch (err) {
      console.log('delete model error', err)
      return '删除失败'
    }

  }
}