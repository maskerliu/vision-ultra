import axios, { AxiosRequestConfig, HttpStatusCode, Method } from 'axios'
import cors, { CorsOptions } from 'cors'
import express, { Application, Request, Response } from 'express'
// import fileUpload from 'express-fileupload'
import compression from 'compression'
import fse from 'fs-extra'
import { Server } from 'http'
import http2express from 'http2-express'
import path from 'path'
import tcpPortUsed from 'tcp-port-used'
import { ApiPath } from '../shared/api.const'
import { BizConfig } from '../shared/base.models'
import { bizContainer } from './IocContainer'
import { IocTypes, IS_DEV, USER_DATA_DIR } from './MainConst'
import { CommonRouter, FaceRecRouter, MapiRouter } from './router'
import { CommonService, PushService } from './service'

export class MainServer {

  private buildConfig = JSON.parse(process.env.BUILD_CONFIG as string)

  private httpServer: Server
  private httpApp: Application

  private mapiRouter: MapiRouter
  private faceRecRouter: FaceRecRouter
  private commonRouter: CommonRouter
  private commonService: CommonService
  private pushService: PushService

  bootstrap() {
    this.commonRouter = bizContainer.get(IocTypes.CommonRouter)
    this.mapiRouter = bizContainer.get(IocTypes.MapiRouter)
    this.commonService = bizContainer.get(IocTypes.CommonService)
    this.pushService = bizContainer.get(IocTypes.PushService)
    this.faceRecRouter = bizContainer.get(IocTypes.FaceRecRouter)
  }

  private corsOpt: CorsOptions = {
    credentials: true,
    optionsSuccessStatus: 200,
  }

  public async start() {
    let portUsed = await tcpPortUsed.check(this.commonService.allConfig.port, '127.0.0.1')
    let config = this.commonService.allConfig
    config.portUsed = portUsed
    this.commonService.saveAllConfig(config)

    await this.stop()
    await this.waitForPortRelease(this.commonService.allConfig.port)
    this.initHttpApp()
    await this.startHttpServer()
  }

  private async waitForPortRelease(port: number, maxRetries: number = 10, delay: number = 500) {
    for (let i = 0; i < maxRetries; i++) {
      const isUsed = await tcpPortUsed.check(port, '127.0.0.1')
      if (!isUsed) {
        console.log(`port ${port} released`)
        return
      }
      console.log(`wait port ${port} release... (${i + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    console.warn(`port ${port} used, try start server`)
  }

  public getBizConfig() {
    return this.commonService.allConfig
  }

  public updateBizConfig(config: BizConfig) {

    if (this.commonService.allConfig.port !== config.port ||
      this.commonService.allConfig.protocol !== config.protocol ||
      this.commonService.allConfig.modelPath == config.modelPath) {

      this.start()
    }

    this.commonService.saveAllConfig(config)
  }

  public async stop(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer == null) {
        console.log(`http server not started`)
        resolve()
        return
      }

      this.pushService.closeWebSocketServer()

      const timeoutId = setTimeout(() => {
        reject(new Error('shutdown timeout'))
      }, timeout)

      this.httpServer.close((err) => {
        clearTimeout(timeoutId)
        if (err) {
          reject(err)
          console.log(`http server closed, ${err}`)
        } else {
          console.log(`http server closed`)
          this.httpServer = null
          resolve()
        }
      })
    })
  }

  private initHttpApp() {
    this.httpApp = http2express(express)
    this.corsOpt.origin = [
      `${this.commonService.allConfig.protocol}://localhost:${this.commonService.allConfig.port}`,
      `${this.commonService.allConfig.protocol}://localhost:9080`,
      `${this.commonService.allConfig.protocol}://localhost:9081`,
      `${this.commonService.allConfig.protocol}://${this.commonService.allConfig.ip}:${this.commonService.allConfig.port}`,
      `${this.commonService.allConfig.protocol}://${this.commonService.allConfig.ip}:9080`,
      `${this.commonService.allConfig.protocol}://${this.commonService.allConfig.ip}:9081`,
    ]

    if (!IS_DEV) this.httpApp.use(compression()) // 开启gzip压缩

    this.httpApp.use(/.*/, (req, resp, next) => {
      resp.header('Cross-Origin-Opener-Policy', 'same-origin')
      resp.header('Cross-Origin-Resource-Policy', 'cross-origin')
      resp.header('Access-Control-Allow-Origin', '*')
      next()
    })

    if (this.getBizConfig().modelPath) this.httpApp.use('/static', express.static(this.getBizConfig().modelPath))

    if (IS_DEV) this.httpApp.use('/static', express.static(path.join(__dirname, '../../data')))
    this.httpApp.use('/static', express.static(path.resolve(__dirname, `${IS_DEV ? '../../static' : './static'}`)))
    this.httpApp.use('/_res', express.static(path.join(USER_DATA_DIR, './static')))

    this.httpApp.use(cors(this.corsOpt))
    this.httpApp.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
    this.httpApp.use(express.text({ type: 'application/json', limit: '50mb' }))
    this.httpApp.use(express.json())

    this.httpApp.use(ApiPath.Common, this.commonRouter.router)
    this.httpApp.use(ApiPath.MApi, this.mapiRouter.router)
    this.httpApp.use(ApiPath.FaceRec, this.faceRecRouter.router)
    this.httpApp.use(ApiPath.CorsMediaProxy, this.proxyCorsMedia)
  }

  private async startHttpServer() {

    // this.httpServer.on('stream', (stream, headers) => {
    //   const req = new Request(stream)
    //   req.headers = headers
    //   req.url = headers[':path']
    //   const res = new Response(stream, req)
    //   this.httpApp(req, res, () => { stream.end() })
    // })

    let HTTP: any
    let baseDir = process.env.NODE_ENV == 'development' ? '../' : './'
    if (this.commonService.allConfig.protocol == 'https') {
      HTTP = await import('http2')
      var key = fse.readFileSync(baseDir + 'cert/server.key')
      var cert = fse.readFileSync(baseDir + 'cert/server.crt')
      let opt = { key, cert, allowHTTP1: true }
      this.httpServer = HTTP.createSecureServer(opt, this.httpApp)
    } else {
      HTTP = await import('http')
      this.httpServer = HTTP.createServer(this.httpApp)
    }

    this.pushService.bindServer(this.httpServer)

    this.httpServer.addListener('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`port[${this.commonService.allConfig.port}] ${e.code}`)

        let config = this.commonService.allConfig
        config.portUsed = true
        this.commonService.saveAllConfig(config)
        this.httpServer?.close()
      }
    })

    await new Promise<void>((resolve, reject) => {
      this.httpServer.listen(
        this.commonService.allConfig.port,
        () => {
          console.info(`http server start [${this.commonService.allConfig.port}]`)
          let config = this.commonService.allConfig
          config.portUsed = false
          this.commonService.saveAllConfig(config)
          resolve()
        }
      )

      this.httpServer.on('error', reject)
    })
  }

  private async proxyCorsMedia(req: Request, resp: Response) {
    try {
      let target = req.query['target']
      let options: AxiosRequestConfig = {
        url: target as string,
        method: req.method as Method
      }
      let proxyResp = await axios(options)
      Object.keys(proxyResp.headers).forEach(it => {
        if (it == 'content-length') return
        if (it == 'cache-control') return
        if (it == 'expires') return
        resp.setHeader(it, proxyResp.headers[it])
      })
      resp.status(proxyResp.status)

      let contentType = proxyResp.headers['content-type'] as string
      if (/image.*/.test(contentType)) {
        options.responseType = 'arraybuffer'
      } else if (/audio.*/.test(contentType)) {
        options.responseType = 'arraybuffer'
      } else if (/video.*/.test(contentType)) {
        options.responseType = 'arraybuffer'
      }

      proxyResp = await axios(options)

      switch (options.responseType) {
        case 'arraybuffer':
          resp.end(proxyResp.data)
          break
        case 'stream':
          proxyResp.data.pipe(resp)
          break
        default:
          resp.send(proxyResp.data)
          break
      }
    } catch (err) {
      // console.error(err)
      resp.status(HttpStatusCode.InternalServerError)
      resp.send(err)
    } finally {
      resp.end()
    }
  }

}