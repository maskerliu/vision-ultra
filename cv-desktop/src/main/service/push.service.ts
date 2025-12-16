import { Server } from 'http'
import { injectable } from 'inversify'
import { Connection, createServer, Server as SockServer } from 'sockjs'
import { CommonApi, ProxyMock } from '../../common'

type PushClient = { conn: Connection, uid: string, username: string, connId: string }

@injectable()
export class PushService  {
  pushClients: Map<String, PushClient>
  private sockjsServer: SockServer

  constructor() {
    this.pushClients = new Map()
    this.sockjsServer = createServer({ prefix: '/echo', websocket: true })
    this.sockjsServer.on('connection', (conn: any) => {
      conn.on('data', (data: any) => { this.handleMsg(conn, data) })
      conn.on('close', () => { this.handleClose(conn) })
      conn.on("error", () => { this.handleError(conn) })
    })
  }

  public bindServer(httpServer: Server) {
    this.sockjsServer.installHandlers(httpServer)
  }

  public closeWebSocketServer(callback: any) {
    this.pushClients.forEach(it => {
      it.conn.close()
      it.conn.destroy()
    })
    this.pushClients.clear()
    this.sockjsServer
  }

  public sendMessage(clientUid: String, data: CommonApi.PushMsg<any>) {
    if (this.pushClients.has(clientUid)) {
      this.pushClients.get(clientUid).conn.write(JSON.stringify(data))
    }
  }

  public sendProxyMessage(clientUid: String, data: ProxyMock.ProxyRequestRecord | ProxyMock.ProxyStatRecord) {

    let pushMsg: CommonApi.PushMsg<ProxyMock.ProxyRequestRecord | ProxyMock.ProxyStatRecord> = {
      type: CommonApi.PushMsgType.TXT,
      payload: {
        type: CommonApi.BizType.Proxy,
        content: data
      }
    }
    if (this.pushClients.has(clientUid)) {
      this.pushClients.get(clientUid).conn.write(JSON.stringify(pushMsg))
    }
  }

  public hasProxy(uid: string): boolean {
    return this.pushClients.has(uid)
  }

  public getAllPushClients() {
    let result: CommonApi.MsgPushClient[] = []
    this.pushClients.forEach(it => {
      result.push({
        connId: it.conn.id,
        uid: it.uid,
        username: it.username,
        ip: it.conn.remoteAddress,
        port: it.conn.remotePort
      })
    })

    return result
  }

  private handleMsg(conn: Connection, data: any) {
    let msg: CommonApi.PushMsg<any> = JSON.parse(data)
    switch (msg.type) {
      case CommonApi.PushMsgType.CMD: {
        this.handleCMD(conn, msg)
        break
      }
      case CommonApi.PushMsgType.TXT: {
        this.handleTXT(conn, msg)
        break
      }
    }
  }

  private handleClose(conn: Connection) {
    let keys = [...this.pushClients.keys()]
    keys.forEach(key => {
      if (this.pushClients.get(key).connId == conn.id) { this.pushClients.delete(key) }
    })

    this.boardcastClientInfos()
  }

  private handleError(conn: Connection) {
    let keys = [...this.pushClients.keys()]
    keys.forEach(key => {
      if (this.pushClients.get(key).connId == conn.id) this.pushClients.delete(key)
    })

    this.boardcastClientInfos()
  }

  private handleCMD(conn: Connection, msg: CommonApi.PushMsg<any>) {
    switch (msg.payload.type) {
      case CommonApi.CMDType.REGISTER:
        let client: PushClient = {
          conn: conn,
          uid: msg.payload.content.uid,
          username: msg.payload.content.username,
          connId: conn.id
        }
        this.pushClients.set(client.uid, client)
        this.boardcastClientInfos()
        break
      case CommonApi.CMDType.RECONNECT:
        break
      case CommonApi.CMDType.KICKDOWN:
        if (this.pushClients.has(msg.to))
          this.pushClients.get(msg.to).conn.write(JSON.stringify(msg))
        break
    }
  }

  private handleTXT(conn: any, msg: CommonApi.PushMsg<any>) {
    switch (msg.payload.type) {
      case CommonApi.BizType.IM: {
        if (msg.to == null) { // boardcast to everyone
          this.pushClients.forEach(it => {
            if (it.uid != msg.from) it.conn.write(JSON.stringify(msg))
          })
        } else {
          this.pushClients.get(msg.to).conn.write(JSON.stringify(msg))
        }
        break
      }
    }
  }

  private boardcastClientInfos() {
    let data: Array<CommonApi.ClientInfo> = []

    this.pushClients.forEach(it => {
      data.push({
        connId: it.conn.id,
        uid: it.uid,
        username: it.username,
        ip: it.conn.remoteAddress,
        port: it.conn.remotePort
      })
    })

    let msg: CommonApi.PushMsg<Array<CommonApi.ClientInfo>> = {
      type: CommonApi.PushMsgType.TXT,
    }

    msg.payload = {
      type: CommonApi.BizType.ClientInfos,
      content: data
    }

    this.pushClients.forEach(it => {
      it.conn.write(JSON.stringify(msg))
    })
  }
}