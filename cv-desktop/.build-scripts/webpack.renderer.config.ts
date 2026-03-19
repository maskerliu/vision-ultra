'use strict'

import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import { fileURLToPath } from 'url'
import { VueLoaderPlugin } from 'vue-loader'
// import   from 'babel-loader'
import webpack, { Configuration } from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import pkg from '../package.json' assert { type: "json" }
import { BaseConfig } from './webpack.base.config'

const { DefinePlugin, LoaderOptionsPlugin, NoEmitOnErrorsPlugin } = webpack

const dirname = path.dirname(fileURLToPath(import.meta.url))

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
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
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
        test: /\.(tflite|data|binarypb)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][hash][ext]'
        }
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
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
    // new NodePolyfillPlugin(),
    new DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    }),
  ]

  output: Configuration['output'] = {
    filename: '[name].js',
    path: path.join(dirname, '../dist/electron'),
    publicPath: '/',
  }

  resolve: Configuration['resolve'] = {
    alias: {
      '@': path.join(dirname, '../src/renderer'),
    },
    extensions: ['.ts', '.js', '.vue', '.json', '.css', '.wasm'],
    fallback: {
      'crypto': path.resolve(dirname, '../../node_modules/crypto-browserify'),
      'path': path.resolve(dirname, '../../node_modules/path-browserify'),
      'stream': path.resolve(dirname, '../../node_modules/stream-browserify'),
      'vm': path.resolve(dirname, '../../node_modules/vm-browserify'),
      'fs': false
    }
  }

  optimization: Configuration['optimization'] = {
    minimize: false,
  }

  init(localServer?: string) {
    super.init()

    this.plugins?.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.posix.join(dirname, '../../node_modules/@mediapipe/tasks-vision/wasm/'),
            to: path.join(dirname, '../dist/electron/static/tasks-vision/wasm/'),
          },
          // {
          //   from: path.posix.join(dirname, '../../node_modules/tesseract.js-core/'),
          //   to: path.join(dirname, '../dist/electron/static/tesseract.js-core/'),
          // },
        ]
      }),
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
        //   logLevel: 'info',
        //   excludeAssets: [/\.hot-update.js$/]
        // }),
      )
    } else {
      this.optimization = {
        minimize: true,
        // usedExports: true,
        // sideEffects: false,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              keep_classnames: true,
              keep_fnames: true,
              ecma: 2020,
              compress: {
                comparisons: false,
                drop_console: true,
                drop_debugger: true,
                unused: true,
                dead_code: true,
              },
              toplevel: true,
              mangle: false, // 注意：mangle可能导致问题，如果使用了ES6+的import/export结构，最好设置为false或在Babel中处理mangle
            },
            exclude: /[\\/]node_modules[\\/]/,
            extractComments: false,
          }),
        ]
      }

      this.optimization.splitChunks = {
        chunks: 'all',
        minSize: 30000,
        cacheGroups: {
          vender: {
            name: 'vender',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          vue: {
            name: 'vue',
            priority: 20,
            test: /[\\/]node_modules[\\/]vue|vue-router|vue-i18n|pinia|@vue[\\/]/
          },
          buffer: {
            name: 'buffer',
            priority: 20,
            test: /[\\/]node_modules[\\/]buffer|safe-buffer|ieee754|base64-js[\\/]/
          },
          vant: {
            name: "vant",
            priority: 20,
            test: /[\\/]node_modules[\\/]vant|@vant[\\/]/
          },
          live2d: {
            name: 'live2d',
            priority: 20,
            test: /[\\/]node_modules[\\/]live2d-renderer|kalidokit|magic-bytes[\\/]/
          },
          mediapipe: {
            name: 'mediapipe',
            priority: 20,
            test: /[\\/]node_modules[\\/]@mediapipe[\\/]/,
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
          onnxruntime: {
            name: 'onnxruntime',
            test: /[\\/]node_modules[\\/]onnxruntime-web[\\/]/,
            priority: 30,
            chunks: 'all',
            enforce: true,
          },
          worker: {
            name: 'worker',
            test: /\.worker\.ts$/,
            priority: 40,
            chunks: 'all',
            enforce: true,
          },
          tess: {
            name: 'tess',
            test: /[\\/]node_modules[\\/]tesseract.js[\\/]/,
            priority: 20,
          },
          hls: {
            name: 'hls',
            test: /[\\/]node_modules[\\/]hls.js[\\/]/,
            priority: 20,
          },
          echarts: {
            name: 'echarts',
            test: /[\\/]node_modules[\\/]echarts|zrender[\\/]/,
            priority: 20,
          },

        }
      }
      this.plugins?.push(new LoaderOptionsPlugin({ minimize: true }))
      this.output!.publicPath = './'
    }

    return this
  }
}

export default new RendererConfig()