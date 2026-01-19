'use strict'

import chalk from 'chalk'
import { deleteSync } from 'del'
import minimist from 'minimist'
import Spinnies from 'spinnies'
import webpack from 'webpack'
import pkg from '../package.json' assert { type: "json" }
import { BaseConfig } from './webpack.base.config'
import mainConfig from './webpack.main.config'
import rendererConfig from './webpack.renderer.config'
import webConfig from './webpack.web.config'

const Run_Mode_PROD = 'production'

process.env.NODE_ENV = Run_Mode_PROD
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
process.env.DEBUG = 'electron-builder'


const spinner = { interval: 80, frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'] }
const spinnies = new Spinnies({ color: 'blue', succeedColor: 'green', spinner })

export function run() {
  let argv = minimist(process.argv.slice(2))
  if (argv['target'] == 'clean') clean()
  if (argv['target'] == 'web') web()
  else build()
}

function clean() {
  console.log('cleaning...')
  deleteSync([`build/${pkg.version}/*`])
  deleteSync(['dist/electron/*', 'dist/web/*', '!.gitkeep'])
  console.log(`\n${chalk.bgGreen.white(' DONE ') + ' '}\n`)
  process.exit()
}

async function build() {
  greeting()
  deleteSync([`build/${pkg.version}/*`])
  deleteSync(['dist/electron/*', 'dist/web/*', '!.gitkeep'])

  addSpinnerTask(mainConfig)
  addSpinnerTask(rendererConfig)
  // addSpinnerTask(webConfig)
}

async function addSpinnerTask(config: BaseConfig) {
  spinnies.add(config.name, { text: `  build ${config.name}...` })
  pack(config)
}

function pack(config: BaseConfig) {
  let startTime = Date.now()
  config.init().mode = Run_Mode_PROD
  let compiler = webpack(config)
  compiler.run((err, stats) => {
    if (err) {
      spinnies.fail(config.name, { text: `  ${err}` })
    } else if (stats.hasErrors()) {
      let err = ''
      stats.toString({ chunks: true, colors: true })
        .split(/\r?\n/)
        .forEach(line => { err += `    ${line}\n` })
      spinnies.fail(config.name, { text: `  ${config.name} build fail, cost ${Date.now() - startTime}ms\n` })
      console.error(err)
    } else {
      spinnies.succeed(config.name, { text: `  ${config.name} build success, cost ${Date.now() - startTime}ms` })
    }
  })
}

function web() {
  deleteSync(['dist/web/*', '!.gitkeep'])
  addSpinnerTask(webConfig)
}

function greeting() {
  console.log(chalk.bgGreen.white('    lets-build'.padEnd(process.stdout.columns, ' ')))
}

run()