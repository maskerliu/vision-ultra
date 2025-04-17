import cv from '@u4/opencv4nodejs'
import {
  app, BrowserWindow, BrowserWindowConstructorOptions,
  globalShortcut, ipcMain, Menu, session, Tray
} from 'electron'
import fs from 'original-fs'
import os from 'os'
import path from 'path'
import { MainAPICMD } from '../common/ipc.api'
import './IPCServices'
import { IS_DEV, USER_DATA_DIR } from './MainConst'
import { MainServer } from './MainServer'

const BUILD_CONFIG = JSON.parse(process.env.BUILD_CONFIG)

const VUE_PLUGIN = os.platform() == 'darwin' ? '~/Downloads/vue-devtools/7.6.8_0' : 'D:/vue-devtools/7.6.5_0'

export default class MainApp {
  private mainWindow: BrowserWindow = null
  private winURL: string = IS_DEV ? `${BUILD_CONFIG.protocol}://localhost:9080` : `file://${__dirname}/index.html`
  private iconDir: string
  private trayIconFile: string
  private mainServer: MainServer = new MainServer()

  constructor() {
    this.iconDir = path.join(__dirname, IS_DEV ? '../../icons' : './static')
    let ext = os.platform() == 'win32' ? 'ico' : 'png'
    this.trayIconFile = path.join(this.iconDir, `icon.${ext}`)
    this.mainServer.bootstrap()

    console.log('home', app.getPath('temp'))
  }

  public async startApp() {
    app.setName('VisionUltra')
    app.disableHardwareAcceleration()
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
    app.commandLine.appendSwitch('ignore-certificate-errors')
    app.commandLine.appendSwitch('disable-gpu')
    app.commandLine.appendSwitch('disable-software-rasterizer')

    if (process.env.NODE_ENV == 'development') {
      app.commandLine.appendSwitch('trace-deprecation')
      app.commandLine.appendSwitch('trace-warnings')
      app.commandLine.appendSwitch('experimental-worker')
      app.commandLine.appendSwitch('experimental-wasm-threads')
      app.commandLine.appendSwitch('unhandled-rejections', 'strict')
      app.commandLine.appendSwitch('inspect', '5858')
    }

    if (os.platform() == 'linux' && os.userInfo().username == 'root') {
      app.commandLine.appendSwitch('disable-chromium-sandbox')
      app.commandLine.appendSwitch('disable-gpu-sandbox')
      app.commandLine.appendSwitch('no-sandbox')
    }

    app.on('activate', () => {
      if (this.mainWindow == null) {
        this.createMainWindow()
      }
    })

    app.on('ready', () => {
      // this.testCV()

      globalShortcut.register('CommandOrControl+q', () => {
        app.quit()
      })

      let lock = app.requestSingleInstanceLock()
      if (!lock) app.quit()

      this.initSessionConfig()
      this.initIPCService()

      if (this.mainWindow == null) {
        this.createMainWindow()
      }

      this.createTrayMenu()
    })

    app.on('second-instance', (_, args, workDir) => {
      console.log(args, workDir)
    })

    app.on('before-quit', () => {
      app.releaseSingleInstanceLock()

      clearInterval(this.progressInterval)
    })

    app.on('window-all-closed', () => {
      this.mainWindow?.destroy()
      this.mainWindow = null
      if (os.platform() !== 'win32') app.quit()
    })

    Menu.setApplicationMenu(null)

    this.initAppEnv()
    try {
      await this.mainServer.start()
    } catch (error) {
      console.error(error)
    }
  }

  private createMainWindow() {

    if (this.mainWindow != null) {
      this.mainWindow.show()
      return
    }

    let winOpt: BrowserWindowConstructorOptions = {
      icon: this.trayIconFile,
      title: "VisionUltra",
      width: 1100,
      height: 670,
      minHeight: 640,
      useContentSize: true,
      transparent: false,
      frame: true,
      resizable: true,
      show: false,
      titleBarStyle: os.platform() === 'darwin' ? 'hidden' : 'hidden',
      titleBarOverlay: { color: "#f8f8f800", symbolColor: "black" },
      trafficLightPosition: { x: os.platform() == 'darwin' ? 1030 : 10, y: 10 },
      webPreferences: {
        offscreen: false,
        webSecurity: false,
        devTools: true,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload: path.join(__dirname, 'preload.cjs')
      },
    }

    this.mainWindow = new BrowserWindow(winOpt)
    this.mainWindow.loadURL(this.winURL)
    this.mainWindow.setVibrancy('window')

    this.mainWindow.on('resize', () => {

      if (os.platform() == 'darwin')
        this.mainWindow.setWindowButtonPosition({ x: this.mainWindow.getBounds().width - 70, y: 10 })
    })

    this.mainWindow.on('closed', () => {
      // console.log(this.mainWindow)
    })

    this.mainWindow.webContents.openDevTools({ mode: 'detach', activate: false })

    this.mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
      console.error('preload error', error)
    })
    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow.show()
      this.mainWindow.focus()
      this.mainWindow.webContents.send(MainAPICMD.GetSysSettings, this.mainServer.getSysSettings())
    })

    this.dockerProgress()
  }

  private createTrayMenu() {
    let tray = new Tray(path.join(this.iconDir, 'icon-tray.png'))
    const contextMenu = Menu.buildFromTemplate([
      {
        icon: path.join(this.iconDir, 'ic-rule.png'),
        label: '用例管理',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send(MainAPICMD.OpenMockRuleMgr)
        }
      },
      {
        icon: path.join(this.iconDir, 'ic-setting.png'),
        label: '设置',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send(MainAPICMD.OpenSettings)
        }
      },
      {
        icon: path.join(this.iconDir, 'ic-setting.png'),
        label: '开发者面板',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send(MainAPICMD.OpenDevTools)
        }
      },
      {
        icon: path.join(this.iconDir, 'ic-exit.png'),
        label: '退出', click: () => {
          this.mainServer.stop()
          app.quit()
        }
      }
    ])

    tray.on('click', () => {
      if (this.mainWindow == null) {
        this.createMainWindow()
      }
      this.mainWindow.focus()
    })

    tray.setToolTip('VisionUltra')
    tray.setContextMenu(contextMenu)
  }

  private initAppEnv() {
    let resPath = path.join(USER_DATA_DIR, 'static')
    fs.access(resPath, err => {
      if (err) fs.mkdir(resPath, err => console.log(err))
    })

    let dbPath = path.join(USER_DATA_DIR, 'biz_storage')
    fs.access(dbPath, err => {
      if (err) fs.mkdir(dbPath, err => console.log(err))
    })

    let updatePath = path.join(USER_DATA_DIR, 'update')
    fs.access(updatePath, err => {
      if (err) fs.mkdir(updatePath, err => console.log(err))
    })

    let dataPath = path.join(USER_DATA_DIR, 'data')
    fs.access(dataPath, err => {
      if (err) fs.mkdir(dataPath, err => console.log(err))
    })
  }

  private initSessionConfig() {
    if (IS_DEV && os.platform() != 'linux') session.defaultSession.loadExtension(VUE_PLUGIN)

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.url.indexOf('.amap.com') !== -1
        || details.url.indexOf('alicdn.com') !== -1
        || details.url.indexOf('qcloud.com')) {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Access-Control-Allow-Origin': '*'
          },
        })
      } else {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',

          }
        })
      }
    })
  }

  private initIPCService() {
    ipcMain.handle(MainAPICMD.SaveSysSettings, (_, ...args: any) => {
      let curSettings = this.mainServer.getSysSettings()
      let newSettings = JSON.parse(args)

      this.mainServer.updateSysSettings(JSON.parse(args))

      if (newSettings.port !== curSettings.port || newSettings.protocol !== curSettings.protocol) {
        this.mainServer.stop()
        this.mainServer.start()
      }

      this.mainWindow.webContents.send(MainAPICMD.GetSysSettings, this.mainServer.getSysSettings())
    })

    ipcMain.handle(MainAPICMD.SendServerEvent, () => {
      // console.log('send sse')
    })
  }

  private testCV() {
    let imgPath = path.join(__dirname, IS_DEV ? '../../images/opencv-logo.png' : './static/opencv-logo.png')
    cv.imreadAsync(imgPath).then((img) => {
      cv.imshow('image', img)
    }).catch(error => console.error(error))
  }

  progressInterval: any

  private dockerProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
    }
    let c = 0
    this.progressInterval = setInterval(() => {
      // update progress bar to next value
      // values between 0 and 1 will show progress, >1 will show indeterminate or stick at 100%
      this.mainWindow?.setProgressBar(c)

      // increment or reset progress bar
      if (c < 2) {
        c += INCREMENT
      } else {
        c = (-INCREMENT * 5) // reset to a bit less than 0 to show reset state
      }
    }, INTERVAL_DELAY)
  }
}

const INCREMENT = 0.03
const INTERVAL_DELAY = 100 // ms