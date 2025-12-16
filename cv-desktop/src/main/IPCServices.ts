import { spawn } from "child_process"
import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from "electron"
import fse from 'fs-extra'
import { Buffer } from "node:buffer"
import os from 'os'
import path from "path"
import { Version } from "../common"
import { MainAPICMD } from "../common/ipc.api"
import { fullUpdate, incrementUpdate } from "./AppUpdater"
import { USER_DATA_DIR } from "./MainConst"
import { getAppWindow } from "./misc/utils"

ipcMain.handle(MainAPICMD.Relaunch, (_) => {
  if (fse.pathExistsSync(path.join(process.resourcesPath, 'update.asar'))) {
    const logPath = app.getPath('logs')
    const out = fse.openSync(path.join(logPath, 'out.log'), 'a')
    const err = fse.openSync(path.join(logPath, 'err.log'), 'a')
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

ipcMain.handle(MainAPICMD.OpenFile, async (_, target: string) => {
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
  getAppWindow()?.webContents.send(MainAPICMD.OpenFile, os.platform() == 'darwin' ? `file://${result.filePaths[0]}` : result.filePaths[0])
})

ipcMain.handle(MainAPICMD.SaveFileAs, async (_, title: string, fileName: string, data: string | ArrayBuffer, slient = false) => {

  let filePath = path.join(USER_DATA_DIR, fileName)
  await fse.ensureDir(path.dirname(filePath))
  if (slient) {
    await fse.writeFile(path.join(USER_DATA_DIR, fileName), Buffer.from(data as any) as any)
    return
  }

  let filters = [{ name: '全部文件', extensions: ['*'] }]
  let ext = path.extname(fileName)
  if (ext && ext !== '.') {
    const name = ext.slice(1, ext.length)
    if (name) {
      filters.unshift({ name: '', extensions: [name] })
    }
  }

  try {
    await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
      title,
      filters,
      defaultPath: path.join(USER_DATA_DIR, fileName)
    })
    await fse.writeFile(path.join(USER_DATA_DIR, fileName), Buffer.from(data as any) as any)
  } catch (e) {
    console.log(`save as--catch:${e}`)
  }
})


ipcMain.handle(MainAPICMD.OpenDevTools, (_, args?: any) => {
  BrowserWindow.getFocusedWindow()?.webContents.openDevTools({ mode: 'detach', activate: false })
})


ipcMain.handle(MainAPICMD.SetAppTheme, (_, theme: ('system' | 'light' | 'dark')) => {
  nativeTheme.themeSource = theme
  if (os.platform() == 'darwin') {
    // console.log(this.mainWindow.setTitleBarOverlay)
  } else {
    BrowserWindow.getFocusedWindow()?.setTitleBarOverlay({
      color: '#f8f8f800',
      symbolColor: nativeTheme.shouldUseDarkColors ? 'white' : 'black'
    })
  }
})

ipcMain.handle(MainAPICMD.DownloadUpdate, async (_, newVersion: Version) => {
  if (newVersion.fullUpdate) await fullUpdate(newVersion)
  else await incrementUpdate(newVersion)
})