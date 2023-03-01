import {transform as transformSvgr} from '@svgr/core'
import {transform} from 'esbuild'
import fs from 'fs'
import type {Plugin} from 'vite'

interface SvgrPluginOptions {
  query?: string
  keepEmittedAssets?: boolean
  svgrOptions?: SVGROptions
}

interface SVGROptions {
  icon?: boolean
  dimensions?: boolean
  expandProps?: 'start' | 'end' | false
  svgo?: boolean
  ref?: boolean
  memo?: boolean
  replaceAttrValues?: Record<string, string>
  svgProps?: Record<string, string>
  titleProp?: boolean
}

export default function svgrPlugin(options: SvgrPluginOptions = {}): Plugin {
  const transformed: Array<string> = []

  return {
    name: 'vite:svgr',

    async transform(code: any, id: string) {
      const svgFilePattern = options?.query ? `.svg?${options.query}` : '.svg'
      if (id.indexOf(svgFilePattern) === -1) {
        return null
      }

      const svgrOptions = options?.svgrOptions ?? {}
      const svgName = options?.query ? id.split(`?${options.query}`)[0] : id
      const svgDataPath = svgName
      const svgData = await fs.promises.readFile(svgDataPath, 'utf8')
      const componentCode = await transformSvgr(svgData, svgrOptions, {filePath: svgDataPath})
      const component = await transform(componentCode, {loader: 'jsx'})
      transformed.push(`${svgName}?component`)

      return {code: component.code, map: null}
    },

    generateBundle(config: any, bundle: {[key: string]: any}) {
      if (options.keepEmittedAssets) {
        return
      }
      // Discard transformed SVG assets from bundle so they are not emitted
      for (const [key, bundleEntry] of Object.entries(bundle)) {
        const {type, name} = bundleEntry
        if (
          type === 'asset' &&
          name?.endsWith('.svg') &&
          transformed.findIndex(id => id.includes(name)) >= 0
        ) {
          delete bundle[key]
        }
      }
    },
  }
}
