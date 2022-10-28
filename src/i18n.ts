import { render, Scope } from 'micromustache'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { I18nError } from './errors'

interface I18nOptions {
  localesPath?: string
  defaultLocale?: string
  currentLocale?: string
  tags?: [string, string]
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
   * Returns default locale - a locale which will be used in case current locale returns nothing
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

  private loadDictionaries() {
    if (this.localesPath === undefined) {
      throw new I18nError('`localesPath` is not defined')
    }

    const files = readdirSync(this.localesPath).filter(file => file.endsWith('.json'))

    const dictionaries = files.reduce(
      (acc, path) => {
        const key = path.split('.')[0]

        if (!this.languages.includes(key)) {
          this.languages.push(key)
        }

        acc[key] = JSON.parse(readFileSync(resolve(this.localesPath as string, path), 'utf8'))

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
   * Returns raw entity from the JSON file. An alias for `__r`
   * @param {string} key Locale key
   * @alias __r
   */
  r<T>(key: string) {
    return this.__r<T>(key)
  }

  /**
   * Returns raw entity from the JSON file. An alias for `__r`
   * @param {string} key Locale key
   * @alias __r
   */
  raw<T>(key: string) {
    return this.__r<T>(key)
  }

  /**
   * Returns raw entity from the JSON file
   * @param {string} key Locale key
   */
  __r<T>(key: string): T {
    this.preload()

    return this.getTemplate(key, false) as T
  }

  /**
   * Renders the template from the locale file. An alias for `__`
   * @param {string} key Locale key
   * @param {Scope} scope Scope for variables
   * @param {string?} default_ Default value
   * @alias __
   */
  t(key: string, scope?: Scope, default_?: string) {
    return this.__(key, scope, default_)
  }

  /**
   * Renders the template from the locale file. An alias for `__`
   * @param {string} key Locale key
   * @param {Scope} scope Scope for variables
   * @param {string?} default_ Default value
   * @alias __
   */
  translate(key: string, scope?: Scope, default_?: string) {
    return this.__(key, scope, default_)
  }

  /**
   * Renders the template from the locale file
   * @param {string} key Locale key
   * @param {Scope} scope Scope for variables
   * @param {string?} default_ Default value
   */
  __(key: string, scope?: Scope, default_?: string) {
    this.preload()

    const template = this.getTemplate(key)

    return (
      template === key && default_ !== undefined
        ? default_
        : this.render(template, scope)
    )
  }

  /**
   * Renders the plural template from the locale file. An alias for `__n`
   * @param {number} count Amount of something
   * @param {string} key Locale key
   * @param {Scope} scope Scope for variables
   * @alias __n
   */
  p(count: number, key: string, scope?: Scope) {
    return this.__n(count, key, scope)
  }

  /**
   * Renders the plural template from the locale file. An alias for `__n`
   * @param {number} count Amount of something
   * @param {string} key Locale key
   * @param {Scope} scope Scope for variables
   * @alias __n
   */
  plural(count: number, key: string, scope?: Scope) {
    return this.__n(count, key, scope)
  }

  /**
   * Renders the plural template from the locale file
   * @param {number} count Amount of something
   * @param {string} key Locale key
   * @param {Scope} scope Scope for variables
   */
  __n(count: number, key: string, scope?: Scope) {
    const obj = this.__r<Record<string, any>>(key)

    if (obj === undefined) {
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
      return key
    }

    return this.render(template, scope)
  }

  /**
   * Returns a list of all of translations for a given key in each locale. An alias for `__l`
   * @param {string} key Locales key
   * @param {Scope} scope Scope for variables
   * @alias __l
   */
  l(key: string, scope?: Scope) {
    return this.__l(key, scope)
  }

  /**
   * Returns a list of all of translations for a given key in each locale. An alias for `__l`
   * @param {string} key Locales key
   * @param {Scope} scope Scope for variables
   * @alias __l
   */
  list(key: string, scope?: Scope) {
    return this.__l(key, scope)
  }

  /**
   * Returns a list of all of translations for a given key in each locale
   * @param {string} key Locales key
   * @param {Scope} scope Scope for variables
   */
  __l(key: string, scope?: Scope) {
    this.preload(false)

    const templates: string[] = []

    for (const language of this.languages) {
      const dictionary = this.dictionaries![language]

      const template = this.getTemplate(key, true, dictionary)

      templates.push(this.render(template, scope))
    }

    return templates
  }
}
