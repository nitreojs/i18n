import { Scope } from 'micromustache'

import { Parser } from '../loader.js'

export type Either<T extends string | string[], L = string, R = string[]> = T extends L ? L : R

export type MaybeArray<T> = T | T[]

export type OnMissing = (key: string, locale: string | undefined) => string | void

export { Parser, Scope }

export interface I18nOptions {
  /**
   * Path to locales
   */
  localesPath?: string
  /**
   * Locale which will be used in case current locale was not found
   */
  defaultLocale?: string
  /**
   * Locale which will be used in case no translations found using `currentLocale`
   */
  fallbackLocale?: string | string[]
  /**
   * Current locale
   */
  currentLocale?: string
  /**
   * Render templates tags
   */
  tags?: [string, string]
  /**
   * Should the package throw an error if it fails to find a translation?
   */
  throwOnFailure?: boolean
  /**
   * A function which is called when contents of a file are read
   */
  parser?: Parser
  /**
   * List of accepted file extensions (or an empty one if all files extensions are accepted)
   */
  extensions?: string[]
  /**
   * A symbol resembling an anchor to the other translation in the current locale.
   *
   * @default '#'
   */
  anchor?: string
  /**
   * Maximum inline-anchor resolution depth before throwing (guards against circular anchors)
   */
  maxAnchorDepth?: number
  /**
   * a handler called when a key is missing; may return a replacement string
   */
  onMissing?: OnMissing
}
