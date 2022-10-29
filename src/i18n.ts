import { render, Scope } from 'micromustache'

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { I18nError } from './errors'
import { MaybeArray } from './types/types'

type Parser = (contents: string) => Record<string, any>

const defaultParser: Parser = (contents: string) => JSON.parse(contents)

interface I18nOptions {
  /**
   * Path to locales
   */
  localesPath?: string
  /**
   * Locale which will be used in case current locale was not found
   */
  defaultLocale?: string
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
}

/**
 * Main I18n class
 */
export class I18n {
  private readonly render: (template: string, scope?: Scope) => string

  private dictionaries: Record<string, any> | undefined
  private dictionary: Record<string, any> | undefined
  private languages: string[] = []

  constructor (private options: I18nOptions = {}) {
    if (this.options.tags !== undefined && this.options.tags.length !== 2) {
      throw new I18nError('`tags` should consist of exactly two strings')
    }

    this.render = (template: string, scope?: Scope) => (
      render(template, scope, {
        tags: this.options.tags ?? ['{{', '}}']
      })
    )
  }

  /**
   * Creates `I18n` instance
   */
  static init(options: I18nOptions = {}) {
    return new I18n(options)
  }

  /**
   * Creates `I18n` instance
   */
  static create(options: I18nOptions = {}) {
    return new I18n(options)
  }


  private loadDictionaries() {
    if (this.localesPath === undefined) {
      throw new I18nError('`localesPath` is not defined')
    }

    const files = readdirSync(this.localesPath)
      .filter(
        (file) => (
          this.extensions.length === 0
            ? true
            : this.extensions.includes(
                file.slice(file.lastIndexOf('.') + 1)
              )
        )
      )

    const dictionaries = files.reduce(
      (acc, path) => {
        const key = path.split('.')[0]

        if (!this.languages.includes(key)) {
          this.languages.push(key)
        }

        acc[key] = this.parser(
          readFileSync(
            resolve(this.localesPath as string, path),
            'utf8'
          )
        )

        return acc
      },
      {} as Record<string, any>
    )

    if (dictionaries.length === 0) {
      throw new I18nError('zero dictionaries found')
    }

    this.dictionaries = dictionaries
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

  private lookup(object: Record<string, any>, path: string, failOnNonString: boolean) {
    const keys = path.split('.')

    let result: any = { ...object }

    for (const key of keys) {
      result = result[key]

      if (result === undefined) {
        result = path

        break
      }
    }

    if (typeof result !== 'string' && failOnNonString) {
      throw new I18nError(`failed to lookup for '${path}': the result is not a string`)
    }

    return result
  }

  private getTemplate(key: string, failOnNonString = true, dictionary = this.dictionary!) {
    if (key.includes('.')) {
      return this.lookup(dictionary, key, failOnNonString)
    }

    const template = dictionary[key]

    if (template === undefined) {
      return key
    }

    if (typeof template !== 'string' && failOnNonString) {
      throw new I18nError(`failed to lookup for '${key}': the result is not a string`)
    }

    return template
  }

  private preload(requireLocale = true) {
    if (this.dictionaries === undefined) {
      this.loadDictionaries()
    }

    if (this.dictionary === undefined && requireLocale) {
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
  }


  /**
   * Returns a list of render templates tags
   */
  get tags() {
    return this.options.tags ?? ['{{', '}}']
  }

  /**
   * Updates a list of render templates tags
   */
  set tags(tags) {
    this.options.tags = tags
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
   * Returns all the languages found in `localesPath`
   */
  getLanguages() {
    return this.languages
  }


  /**
   * Returns raw entity from the locale file. An alias for `__r`
   * @param key Locale key
   * @alias __r
   */
  r<T>(key: string) {
    return this.__r<T>(key)
  }

  /**
   * Returns raw entity from the locale file. An alias for `__r`
   * @param key Locale key
   * @alias __r
   */
  raw<T>(key: string) {
    return this.__r<T>(key)
  }

  /**
   * Returns raw entity from the locale file
   * @param key Locale key
   */
  __r<T>(key: string): T {
    this.preload()

    const template = this.getTemplate(key, false) as T

    if (this.throwOnFailure) {
      throw new I18nError(`failed to get raw entity by key '${key}'`)
    }

    return template
  }


  /**
   * Renders the template from the locale file. An alias for `__`
   * @param keys String or an array of strings of translation keys
   * @param scope Scope for variables
   * @alias __
   */
  t(keys: MaybeArray<string>, scope?: Scope) {
    return this.__(keys, scope)
  }

  /**
   * Renders the template from the locale file. An alias for `__`
   * @param keys String or an array of strings of translation keys
   * @param scope Scope for variables
   * @alias __
   */
  translate(keys: MaybeArray<string>, scope?: Scope) {
    return this.__(keys, scope)
  }

  /**
   * Renders the template from the locale file
   * @param keys String or an array of strings of translation keys
   * @param scope Scope for variables
   */
  __(keys: MaybeArray<string>, scope?: Scope) {
    this.preload()

    const isInitiallyAnArray = Array.isArray(keys)

    const actualKeys: string[] = isInitiallyAnArray ? keys : [keys]

    for (let i = 0; i < actualKeys.length; i++) {
      const key = actualKeys[i]

      const template = this.getTemplate(key)

      if (isInitiallyAnArray && template !== key) {
        return template as string
      }

      if (template !== key) {
        return template as string
      }
    }

    if (this.throwOnFailure) {
      throw new I18nError(`failed to render the template by keys ${actualKeys.join(', ')}`)
    }

    return actualKeys[actualKeys.length - 1]
  }


  /**
   * Renders the plural template from the locale file. An alias for `__n`
   * @param count Amount of something
   * @param key Locale key
   * @param scope Scope for variables
   * @alias __n
   */
  p(count: number, key: string, scope?: Scope) {
    return this.__n(count, key, scope)
  }

  /**
   * Renders the plural template from the locale file. An alias for `__n`
   * @param count Amount of something
   * @param key Locale key
   * @param scope Scope for variables
   * @alias __n
   */
  plural(count: number, key: string, scope?: Scope) {
    return this.__n(count, key, scope)
  }

  /**
   * Renders the plural template from the locale file
   * @param count Amount of something
   * @param key Locale key
   * @param scope Scope for variables
   */
  __n(count: number, key: string, scope?: Scope) {
    const obj = this.__r<Record<string, any>>(key)

    if (obj === undefined) {
      if (this.throwOnFailure) {
        throw new I18nError(`failed to find the template by key '${key}'`)
      }

      return key
    }

    // INFO: why ar-EG? because this locale returns the most amount of rules possible and thus is good for our task
    const pr = new Intl.PluralRules('ar-EG')
    const rule = pr.select(count)

    const templateByRule: Partial<Record<typeof rule, any>> = {
      zero: obj.zero ?? obj.other ?? obj.many,
      one: obj.one ?? obj.other,
      two: obj.two ?? obj.few ?? obj.many,
      few: obj.few ?? obj.many,
    }

    const template = templateByRule[rule] ?? obj.many ?? obj.other

    if (template === undefined) {
      if (this.throwOnFailure) {
        throw new I18nError(`failed to render the plural template by key '${key}'`)
      }

      return key
    }

    return this.render(template, scope)
  }


  /**
   * Returns a list of all of translations for a given key in each locale. An alias for `__l`
   * @param key Locales key
   * @param scope Scope for variables
   * @alias __l
   */
  l(key: string, scope?: Scope) {
    return this.__l(key, scope)
  }

  /**
   * Returns a list of all of translations for a given key in each locale. An alias for `__l`
   * @param key Locales key
   * @param scope Scope for variables
   * @alias __l
   */
  list(key: string, scope?: Scope) {
    return this.__l(key, scope)
  }

  /**
   * Returns a list of all of translations for a given key in each locale
   * @param key Locales key
   * @param scope Scope for variables
   */
  __l(key: string, scope?: Scope) {
    this.preload(false)

    const templates: string[] = []

    for (const language of this.languages) {
      const dictionary = this.dictionaries![language]

      const template = this.getTemplate(key, true, dictionary)

      if (template !== key) {
        templates.push(this.render(template, scope))
      }
    }

    if (templates.length === 0 && this.throwOnFailure) {
      throw new I18nError(`failed to get a list by key '${key}'`)
    }

    return templates
  }
}
