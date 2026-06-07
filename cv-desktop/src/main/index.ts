
'use strict'
import path from 'path'
import { install } from 'source-map-support'
import MainApp from './MainApp'
import { IS_DEV } from './MainConst'

install()

process.env.SILENT = 'true'

if (IS_DEV) {
  (<any>global).__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'
let mainApp = new MainApp()
mainApp.startApp()