import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'

const pkg = require('./package.json')

const libraryName = 'layer2storage'

const globals = {
  fs: 'fs',
  path: 'path',
  bufferutil: 'bufferutil',
  http: 'http',
  https: 'https',
  net: 'net',
  url: 'url',
  events: 'events',
  tls: 'tls',
  stream: 'stream',
  zlib: 'zlib',
  'utf-8-validate': 'utf-8-validate'
}

export default {
  input: `src/${libraryName}.ts`,
  output: [
    {
      file: pkg.main,
      name: camelCase(libraryName),
      format: 'umd',
      sourcemap: true,
      globals: globals
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
      globals: globals
    }
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: ['gun'],
  watch: {
    include: 'src/**'
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    // resolve(),

    // Resolve source maps to the original source
    sourceMaps()
  ]
}
