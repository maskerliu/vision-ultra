'use strict'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import { fileURLToPath } from 'url'
import { VueLoaderPlugin } from 'vue-loader'
// import   from 'babel-loader'
import webpack, { Configuration } from 'webpack'
import pkg from '../package.json' assert { type: "json" }
import { BaseConfig } from './webpack.base.config'

const { DefinePlugin, LoaderOptionsPlugin, NoEmitOnErrorsPlugin } = webpack

const dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('dirname', dirname)

let whiteListedModules = ['axios',
  '@mediapipe/face_mesh',
  '@mediapipe/tasks-vision',
  '@tensorflow/tfjs-converter',
  '@tensorflow/tfjs-core',
  // '@tensorflow-models/face-landmarks-detection',
]

class RendererConfig extends BaseConfig {
  devtool: string | false = process.env.NODE_ENV !== 'production' ? "cheap-module-source-map" : false
  name: Configuration['name'] = 'renderer'
  target: Configuration['target'] = 'web'
  entry: Configuration['entry'] = { renderer: path.join(dirname, '../src/renderer/index.ts') }
  externals: Configuration['externals'] = [...Object.keys(pkg.dependencies).filter(d => !whiteListedModules.includes(d))]

  module: Configuration['module'] = {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        resolve: {
          fullySpecified: false,
        },
        options: {
          reactivityTransform: true,
          compilerOptions: {
            isCustomElement: (tag: any) => tag.startsWith('media-')
          }
        }
      },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.worker\.ts$/,
        loader: "worker-loader",
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        resolve: {
          fullySpecified: false,
        },
        options: {
          transpileOnly: true
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'imgs/[name].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'fonts/[name].[ext]'
        }
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async' // 或 'webassembly/sync'
      },
      {
        test: /\.(tflite|data|binarypb)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][hash][ext]'
        }
      }
    ]
  }

  plugins: Configuration['plugins'] = [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new VueLoaderPlugin(),
    new NoEmitOnErrorsPlugin(),
    new NodePolyfillPlugin(),
    new DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    }),
  ]

  output: Configuration['output'] = {
    filename: '[name].js',
    path: path.join(dirname, '../dist/electron'),
  }

  resolve: Configuration['resolve'] = {
    alias: {
      '@': path.join(dirname, '../src/renderer'),
    },
    extensions: ['.ts', '.js', '.vue', '.json', '.css', '.wasm']
  }

  optimization: Configuration['optimization'] = {
    minimize: false,
  }

  init(localServer?: string) {
    super.init()

    this.plugins?.push(
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: path.resolve(dirname, '../src/index.ejs'),
        minify: {
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeComments: true
        },
        nodeModules: process.env.NODE_ENV !== 'production' ? path.resolve(dirname, '../node_modules') : false
      }),
      new DefinePlugin({
        SERVER_BASE_URL: `'${pkg.config.protocol}://localhost:${pkg.config.port}'`, PROTOCOL: `'${pkg.config.protocol}'`
      }),
    )

    if (process.env.NODE_ENV !== 'production') {
      this.plugins?.push(
        new DefinePlugin({ '__static': `'${path.join(dirname, '../static').replace(/\\/g, '\\\\')}'` }),
      )

      this.plugins?.push(
        // new BundleAnalyzerPlugin({
        //   analyzerMode: 'server',
        //   analyzerHost: '127.0.0.1',
        //   analyzerPort: 9088,
        //   reportFilename: 'report.html',
        //   defaultSizes: 'parsed',
        //   openAnalyzer: true,
        //   generateStatsFile: false,
        //   statsFilename: 'stats.json',
        //   statsOptions: null,
        //   logLevel: 'info'
        // }),
      )
    } else {
      this.optimization = {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              keep_classnames: true,
              keep_fnames: true,
              ecma: 2020,
              compress: {
                comparisons: false,
                drop_console: true
              },
              mangle: false, // 注意：mangle可能导致问题，如果使用了ES6+的import/export结构，最好设置为false或在Babel中处理mangle
            },
            exclude: /[\\/]node_modules[\\/]/
          }),
        ]
      }

      this.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vender: {
            name: 'vender',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          vant: {
            name: "vant",
            priority: 20,
            test: /[\\/]node_modules[\\/]vant[\\/]/
          },
          opencvjs: {
            name: 'opencv',
            test: /[\\/]node_modules[\\/]@opencvjs[\\/]/,
            priority: 20,
          },
          tensoflow: {
            name: 'tensoflow',
            test: /[\\/]node_modules[\\/]@tensorflow[\\/]/,
            priority: 20,
          },
          echarts: {
            name: 'echarts',
            test: /[\\/]node_modules[\\/]echarts[\\/]/,
            priority: 20,
          }
        }
      }
      this.plugins?.push(new LoaderOptionsPlugin({ minimize: true }))
      this.output!.publicPath = './'
    }

    return this
  }
}

export default new RendererConfig()