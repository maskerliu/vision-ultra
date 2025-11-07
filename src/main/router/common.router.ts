import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IocTypes } from '../MainConst'
import { BizNetwork } from '../misc/utils'
import { CommonService } from '../service'
import { BaseRouter, ParamType } from './base.router'

interface ReqResp {
  req: Request
  resp: Response
}

@injectable()
export class CommonRouter extends BaseRouter {

  @inject(IocTypes.CommonService)
  private commonService: CommonService
  @inject(IocTypes.PushService)
  private pushService: CommonService

  private _clients: Map<string, ReqResp> = new Map()

  constructor() {
    super()

    this.router.get('/sse/:uid', (req, resp) => {
      resp.setHeader('Content-Type', 'text/event-stream')
      resp.setHeader('Cache-Control', 'no-cache')
      // resp.setHeader('Connection', 'keep-alive')
      // resp.setHeader('Keep-Alive', 'max=10,timeout=15000')
      resp.setHeader('Access-Control-Allow-Origin', '*')
      resp.flushHeaders()

      let uid = req.headers['x-mock-uid'] as string
      if (this._clients.has(uid)) {
        // this._clients.get(uid).resp.end()
        this._clients.delete(uid)
        // console.log(`resp end: ${uid}`)
      } else {
        this._clients.set(uid, { req, resp })
      }

      req.on('error', (err: any) => {
        console.log(`${(new Date())}\terror: ${err}`, err.code)
      })

      req.on('close', () => {
        console.log(`${(new Date())}\treq close: ${uid}\t ${req.closed}`)
        this._clients.delete(uid)
      })
      // console.log(`${logDate(new Date())}\t${req.headers['x-mock-uid']} connected\t ${req.closed}`)
    })

    this.router.get('/sse/broadcast/:uid', (req, resp) => {
      this._clients.forEach(it => {
        console.log(`send data from [${req.params['uid']}] to [${it.req.headers['x-mock-uid']}]`)
        it.resp.write(`event: warning\n`)
        it.resp.write(`id: ${new Date().getTime()}\n`)
        it.resp.write(`data: hello[${Math.random()} from ${req.params['uid']}]\n\n`)
      })
      resp.send(`${req.headers['uid']} broadcast success`)
      resp.end()
    })
  }

  override initApiInfos(): void {
    this.addApiInfo({
      method: BizNetwork.Method_Get, path: '/register/:uid', func: 'register', target: 'commonService',
      params: [{ key: 'uid', type: ParamType.Path }]
    })
    this.addApiInfo({
      method: BizNetwork.Method_Get, path: '/getAllPushClients', func: 'getAllPushClients', target: 'pushService'
    })
    this.addApiInfo({
      method: BizNetwork.Method_Get, path: '/getBizConfig', func: 'getAllConfig', target: 'commonService'
    })
  }
}