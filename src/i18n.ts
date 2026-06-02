import { Scope } from 'micromustache'

import { DEFAULT_ANCHOR, DEFAULT_MAX_ANCHOR_DEPTH, DEFAULT_TAGS } from './constants.js'
import { I18nError } from './errors/index.js'
import { I18nOptions, Key, MaybeArray, PathValue, RawValue } from './types/index.js'
import { createScope } from './scope.js'
import type { ScopedTranslator } from './scope.js'
import { loadDictionariesAsync, loadDictionariesSync, Parser } from './loader.js'
import { lookup, selectPluralTemplate } from './utils/index.js'
import { Renderer } from './renderer.js'

const defaultParser: Parser = (contents: string) => JSON.parse(contents)

/**
 * Main I18n class
 */
export class I18n<T = unknown> {
  private renderer!: Renderer

  private dictionaries: Record<string, any> | undefined
  private dictionary: Record<string, any> | undefined
  private languages: string[] = []

  constructor (private options: I18nOptions = {}) {
    if (this.options.tags !== undefined && this.options.tags.length !== 2) {
      throw new I18nError('`tags` should consist of exactly two strings')
    }

    const anchor = this.options.anchor ?? DEFAULT_ANCHOR

    if (anchor.length !== 1) {
      throw new I18nError('`anchor` should consist of exactly one character')
    }

    this.rebuildRenderer()

    if (this.options.localesPath !== undefined) {
      this.loadDictionaries()
    }
  }

  /**
   * Creates `I18n` instance
   */
  static init<T = unknown> (options: I18nOptions = {}) {
    return new I18n<T>(options)
  }

  /**
   * Creates `I18n` instance
   */
  static create<T = unknown> (options: I18nOptions = {}) {
    return new I18n<T>(options)
  }

  static async load<T = unknown> (options: I18nOptions = {}) {
    const i18n = new I18n<T>({ ...options, localesPath: undefined })

    i18n.options.localesPath = options.localesPath

    if (options.localesPath !== undefined) {
      await i18n.reload()
    }

    return i18n
  }

  private loadDictionaries () {
    if (this.localesPath === undefined) {
      throw new I18nError('`localesPath` is not defined')
    }

    const { dictionaries, languages } = loadDictionariesSync(this.localesPath, this.extensions, this.parser)

    this.dictionaries = dictionaries
    this.languages = languages
  }

  private loadDictionary() {
    const dictionary: Record<string, any> =
      this.dictionaries![this.locale as string] ??
      this.dictionaries![this.defaultLocale as string]

    if (dictionary === undefined) {
      throw new I18nError(`could not find '${this.locale}' dictionary (default: ${this.defaultLocale ?? '[not set]'})`)
    }

    this.dictionary = dictionary
  }

  private rebuildRenderer () {
    this.renderer = new Renderer({
      tags: this.tags,
      anchor: this.anchor,
      maxDepth: this.options.maxAnchorDepth ?? DEFAULT_MAX_ANCHOR_DEPTH,
      resolve: (key: string) => this.getTemplate(key) as string
    })
  }

  private render (template: string, scope?: Scope): string {
    return this.renderer.render(template, scope)
  }

  private localeChain (): string[] {
    const chain: string[] = []

    const add = (locale?: string) => {
      if (locale === undefined) {
        return
      }

      if (!chain.includes(locale)) {
        chain.push(locale)
      }

      if (locale.includes('-')) {
        const base = locale.slice(0, locale.indexOf('-'))

        if (!chain.includes(base)) {
          chain.push(base)
        }
      }
    }

    add(this.locale)
    add(this.defaultLocale)

    const fallback = this.options.fallbackLocale

    if (Array.isArray(fallback)) {
      fallback.forEach(add)
    } else {
      add(fallback)
    }

    return chain
  }

  private getTemplate (key: string, failOnNonString = true, dictionary?: Record<string, any>) {
    const dictionaries = dictionary !== undefined
      ? [dictionary]
      : this.localeChain().map((locale) => this.dictionaries?.[locale]).filter(Boolean) as Record<string, any>[]

    for (const dict of dictionaries) {
      const { value, found } = lookup(dict, key)

      if (!found) {
        continue
      }

      if (typeof value !== 'string' && failOnNonString) {
        throw new I18nError(`failed to lookup for '${key}': the result is not a string`)
      }

      return value
    }

    return key
  }

  private missing (key: string): string | undefined {
    const result = this.options.onMissing?.(key, this.locale)

    return typeof result === 'string' ? result : undefined
  }

  private preload(requireLocale = true) {
    if (this.dictionaries === undefined) {
      this.loadDictionaries()
    }

    if (this.dictionary === undefined && requireLocale) {
      if (this.locale === undefined) {
        throw new I18nError('`currentLocale` is not defined')
      }

      this.loadDictionary()
    }

    if (this.locale === undefined && requireLocale) {
      throw new I18nError('`currentLocale` is not defined')
    }
  }


  /**
   * Returns current locale
   */
  get locale() {
    return this.options.currentLocale
  }

  /**
   * Updates current locale
   * @param locale New locale
   */
  set locale(locale) {
    this.options.currentLocale = locale

    if (this.dictionaries !== undefined) {
      this.loadDictionary()
    }
  }


  /**
   * Returns fallback locale
   */
  get fallbackLocale() {
    return this.options.fallbackLocale
  }

  /**
   * Updates fallback locale
   * @param locale New fallback locale
   */
  set fallbackLocale(locale) {
    this.options.fallbackLocale = locale
  }


  /**
   * Returns default locale - a locale which will be used in case current locale was not found
   */
  get defaultLocale() {
    return this.options.defaultLocale
  }

  /**
   * Updates default locale
   * @param locale New locale
   */
  set defaultLocale(locale) {
    this.options.defaultLocale = locale

    if (this.dictionaries !== undefined) {
      this.loadDictionary()
    }
  }


  /**
   * Returns path to locales
   */
  get localesPath() {
    return this.options.localesPath
  }

  /**
   * Updates locales path
   * @param path New path
   */
  set localesPath(path) {
    this.options.localesPath = path

    this.loadDictionaries()

    this.dictionary = undefined
  }


  /**
   * Returns a list of render templates tags
   */
  get tags() {
    return this.options.tags ?? DEFAULT_TAGS
  }

  /**
   * Updates a list of render templates tags
   */
  set tags (tags) {
    this.options.tags = tags
    this.rebuildRenderer()
  }


  /**
   * Returns whether the package will throw an error if it fails to find a translation
   */
  get throwOnFailure(): boolean {
    return this.options.throwOnFailure ?? false
  }

  /**
   * Updates whether the package will throw an error if it fails to find a translation
   */
  set throwOnFailure(value: boolean | undefined) {
    this.options.throwOnFailure = value ?? false
  }


  /**
   * Returns a function which is called when contents of a file are read
   */
  get parser(): Parser {
    return this.options.parser ?? defaultParser
  }

  /**
   * Updates a function which is called when contents of a file are read
   */
  set parser(parser: Parser | undefined) {
    this.options.parser = parser ?? defaultParser
  }


  /**
   * Returns a list of accepted file extensions (or an empty one if all files extensions are accepted)
   */
  get extensions() {
    return this.options.extensions ?? []
  }

  /**
   * Updates a list of accepted file extensions (or an empty one if all files extensions are accepted)
   */
  set extensions(extensions) {
    this.options.extensions = extensions
  }

  /**
   * Returns a symbol resembling an anchor to the other translation in the current locale
   */
  get anchor () {
    return this.options.anchor ?? DEFAULT_ANCHOR
  }

  /**
   * Updates a symbol resembling an anchor to the other translation in the current locale
   */
  set anchor (anchor) {
    this.options.anchor = anchor
    this.rebuildRenderer()
  }


  /**
   * Returns the onMissing handler
   */
  get onMissing () {
    return this.options.onMissing
  }

  /**
   * Updates the onMissing handler
   */
  set onMissing (handler) {
    this.options.onMissing = handler
  }


  /**
   * Returns maximum anchor resolution depth
   */
  get maxAnchorDepth () {
    return this.options.maxAnchorDepth ?? DEFAULT_MAX_ANCHOR_DEPTH
  }

  /**
   * Updates maximum anchor resolution depth
   */
  set maxAnchorDepth (depth) {
    this.options.maxAnchorDepth = depth
    this.rebuildRenderer()
  }


  /**
   * Returns all the languages found in `localesPath`
   */
  getLanguages() {
    return this.languages
  }

  scope<P extends Key<T>> (prefix: P): ScopedTranslator<PathValue<T, P>> {
    return createScope<T, PathValue<T, P>>(this, prefix as string)
  }

  async reload () {
    if (this.localesPath === undefined) {
      throw new I18nError('`localesPath` is not defined')
    }

    const { dictionaries, languages } = await loadDictionariesAsync(this.localesPath, this.extensions, this.parser)

    this.dictionaries = dictionaries
    this.languages = languages
    this.dictionary = undefined

    if (this.locale !== undefined) {
      this.loadDictionary()
    }
  }

  /**
   * Returns whether [keys] exist in context of current locale
   * @param keys Locale keys to search for
   */
  exists<K extends MaybeArray<Key<T>>> (keys: K): K extends readonly any[] ? boolean[] : boolean {
    this.preload()

    const keysWereArray = Array.isArray(keys)

    const actualKeys: string[] = keysWereArray ? keys : [keys]
    const results: boolean[] = []

    for (const key of actualKeys) {
      const template = this.getTemplate(key)

      results.push(template !== key)
    }

    if (keysWereArray) {
      return results as any
    }

    return results[0] as any
  }


  /**
   * Returns raw entity from the locale file. An alias for `__r`
   * @param key Locale key
   * @alias __r
   */
  r<K extends Key<T>> (key: K): RawValue<T, K> {
    return this.__r<K>(key)
  }

  /**
   * Returns raw entity from the locale file
   * @param key Locale key
   */
  __r<K extends Key<T>> (key: K): RawValue<T, K> {
    this.preload()

    const template = this.getTemplate(key as string, false)

    if (template === key) {
      if (this.throwOnFailure) {
        throw new I18nError(`failed to get raw entity by key '${key}'`)
      }

      const fallback = this.missing(key as string)

      if (fallback !== undefined) {
        return fallback as RawValue<T, K>
      }
    }

    return template as RawValue<T, K>
  }


  /**
   * Renders the template from the locale file. An alias for `__`
   * @param keys String or an array of strings of translation keys
   * @param scope Scope for variables
   * @alias __
   */
  t (keys: MaybeArray<Key<T>>, scope?: Scope) {
    return this.__(keys, scope)
  }

  /**
   * Renders the template from the locale file
   * @param keys String or an array of strings of translation keys
   * @param scope Scope for variables
   */
  __ (keys: MaybeArray<Key<T>>, scope?: Scope) {
    this.preload()

    const isInitiallyArray = Array.isArray(keys)

    const actualKeys: string[] = isInitiallyArray ? keys as string[] : [keys as string]

    for (const key of actualKeys) {
      const template = this.getTemplate(key) as string

      if (template !== key) {
        return this.render(template, scope).trim()
      }
    }

    if (this.throwOnFailure) {
      throw new I18nError(`failed to render the template by keys ${actualKeys.join(', ')}`)
    }

    const fallback = this.missing(actualKeys[actualKeys.length - 1])

    if (fallback !== undefined) {
      return this.render(fallback, scope).trim()
    }

    return this.render(actualKeys[actualKeys.length - 1], scope).trim()
  }


  /**
   * Renders the plural template from the locale file. An alias for `__n`
   * @param count Amount of something
   * @param key Locale key
   * @param scope Scope for variables
   * @alias __n
   */
  p (count: number, key: Key<T>, scope?: Scope) {
    return this.__n(count, key, scope)
  }

  /**
   * Renders the plural template from the locale file
   * @param count Amount of something
   * @param key Locale key
   * @param scope Scope for variables
   */
  __n (count: number, key: Key<T>, scope?: Scope) {
    this.preload()

    const obj = this.getTemplate(key as string, false)

    if (typeof obj !== 'object' || obj === null) {
      if (this.throwOnFailure) {
        throw new I18nError(`failed to find the template by key '${key}'`)
      }

      return this.missing(key as string) ?? key
    }

    const template = selectPluralTemplate(obj as Record<string, any>, count, this.locale as string)

    if (template === undefined) {
      if (this.throwOnFailure) {
        throw new I18nError(`failed to render the plural template by key '${key}'`)
      }

      return this.missing(key as string) ?? key
    }

    return this.render(template, { count, ...scope })
  }


  /**
   * Returns a list of all of translations for a given key in each locale. An alias for `__l`
   * @param key Locales key
   * @param scope Scope for variables
   * @alias __l
   */
  l (key: Key<T>, scope?: Scope) {
    return this.__l(key, scope)
  }

  /**
   * Returns a list of all of translations for a given key in each locale
   * @param key Locales key
   * @param scope Scope for variables
   */
  __l (key: Key<T>, scope?: Scope) {
    this.preload(false)

    const templates: string[] = []

    for (const language of this.languages) {
      const dictionary = this.dictionaries![language]

      const template = this.getTemplate(key as string, true, dictionary)

      if (template !== key) {
        templates.push(this.render(template as string, scope))
      }
    }

    if (templates.length === 0 && this.throwOnFailure) {
      throw new I18nError(`failed to get a list by key '${key}'`)
    }

    return templates
  }
}
