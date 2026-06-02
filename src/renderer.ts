import { render, Scope } from 'micromustache'

import { I18nError } from './errors/index.js'
import { escapeRegExp } from './utils/index.js'

interface RendererOptions {
  tags: [string, string]
  anchor: string
  maxDepth: number
  resolve: (key: string) => string
}

export class Renderer {
  private readonly tags: [string, string]
  private readonly maxDepth: number
  private readonly resolve: (key: string) => string
  private readonly anchorRe: RegExp
  private readonly anchorReGlobal: RegExp

  constructor (options: RendererOptions) {
    this.tags = options.tags
    this.maxDepth = options.maxDepth
    this.resolve = options.resolve

    const [open, close] = options.tags.map(escapeRegExp)
    const anchor = escapeRegExp(options.anchor)
    const source = `${open}\\s*${anchor}(.+?)\\s*${close}`

    this.anchorRe = new RegExp(source)
    this.anchorReGlobal = new RegExp(source, 'g')
  }

  render (template: string, scope?: Scope): string {
    let current = template
    let depth = 0

    while (this.anchorRe.test(current)) {
      if (depth >= this.maxDepth) {
        throw new I18nError(`exceeded max anchor depth (${this.maxDepth}) while rendering — possible circular anchor`)
      }

      depth += 1

      current = current.replace(this.anchorReGlobal, (_match, key: string) => {
        const value = this.resolve(key)

        return value === key ? '' : value
      })
    }

    return render(current, scope, { tags: this.tags })
  }
}
