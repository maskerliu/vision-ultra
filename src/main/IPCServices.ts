import { spawn } from "child_process"
import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from "electron"
import fs from 'fs'
import fse from 'fs-extra'
import os from 'os'
import path from "path"
import { Version } from "../common"
import { MainAPICMD } from "../common/ipc.api"
import { fullUpdate, incrementUpdate } from "./AppUpdater"

ipcMain.handle(MainAPICMD.Relaunch, (_) => {
  if (fse.pathExistsSync(path.join(process.resourcesPath, 'update.asar'))) {
    const logPath = app.getPath('logs')
    const out = fs.openSync(path.join(logPath, 'out.log'), 'a')
    const err = fs.openSync(path.join(logPath, 'err.log'), 'a')
    let updateBash = `update.${os.platform() == 'win32' ? 'exe' : 'sh'}`

    if (os.platform() == 'win32') {
      updateBash = `${path.join(process.resourcesPath, updateBash)}`
    } else {
      updateBash = `sh ${path.join(process.resourcesPath, updateBash)}`
    }
    const child = spawn(
      updateBash,
      [`"${process.resourcesPath}"`, `"${app.getPath('exe')}"`],
      {
        detached: true,
        shell: true,
        stdio: ['ignore', out, err]
      })
    child.unref()
  } else {
    app.relaunch({ execPath: app.isPackaged ? process.execPath : __dirname })
  }
  app.quit()
})

ipcMain.handle(MainAPICMD.OpenFile, async () => {
  let result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ['openFile',],
    filters: [
      {
        name: 'Image',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
      }
    ]
  })

  if (result.canceled) return
  console.info(result.filePaths)
  BrowserWindow.getAllWindows()
    .find((it, idx, _) => { return it.title == 'VisionUltra' })
    .webContents.send(MainAPICMD.OpenFile, result.filePaths[0])
})


ipcMain.handle(MainAPICMD.OpenDevTools, (_, args?: any) => {
  BrowserWindow.getAllWindows()
    .find((it, idx, _) => { return it.title == 'VisionUtra' })
    .webContents.openDevTools({ mode: 'detach', activate: false })
})


ipcMain.handle(MainAPICMD.SetAppTheme, (_, theme: ('system' | 'light' | 'dark')) => {
  nativeTheme.themeSource = theme
  if (os.platform() == 'darwin') {
    // console.log(this.mainWindow.setTitleBarOverlay)
  } else {
    BrowserWindow.getAllWindows()
      .find((it, idx, _) => { return it.title == 'VisionUltra' })
      .setTitleBarOverlay({
        color: '#f8f8f800',
        symbolColor: nativeTheme.shouldUseDarkColors ? 'white' : 'black'
      })
  }
})

ipcMain.handle(MainAPICMD.DownloadUpdate, async (_, newVersion: Version) => {
  if (newVersion.fullUpdate) await fullUpdate(newVersion)
  else await incrementUpdate(newVersion)
})