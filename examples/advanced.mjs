// advanced features. run from the repo root with:  node examples/advanced.mjs
// (run `npm run build` first — these import the package by its own name)

import { resolve } from 'node:path'
import { I18n } from '@starkow/i18n'

const dir = (name) => resolve(import.meta.dirname, name)

// 1. fallback chain + BCP-47 base fallback
//    'ru-RU' has no dictionary, so it falls back to base 'ru';
//    'footer' is missing in ru, so it falls back further to 'en'.
const i18n = new I18n({
  localesPath: dir('locales'),
  currentLocale: 'ru-RU',
  fallbackLocale: 'en'
})

console.log(i18n.t('greeting', { name: 'Лена' })) // Привет, Лена!   (ru via base fallback)
console.log(i18n.t('footer', { year: 2026 }))     // © 2026 Acme     (en via fallback chain)

// 2. onMissing — observe / supply a fallback for missing keys
const tracked = new I18n({
  localesPath: dir('locales'),
  currentLocale: 'en',
  onMissing: (key, locale) => {
    console.log(`   (missing "${key}" in "${locale}")`)
    return `⟨${key}⟩`
  }
})

console.log(tracked.t('account.deleted')) // ⟨account.deleted⟩  (+ the log above)

// 3. scoped translator — bind a key prefix
const en = new I18n({ localesPath: dir('locales'), currentLocale: 'en' })
const nav = en.scope('nav')
console.log(`${nav.t('home')} / ${nav.t('settings')}`) // Home / Settings

// 4. nested locale directories — each file is a key namespace
const nested = new I18n({ localesPath: dir('locales-nested'), currentLocale: 'ru' })
console.log(nested.t('common.hi'))       // Привет
console.log(nested.t('errors.notFound')) // Не найдено
console.log(JSON.stringify(nested.__r('errors'))) // {"notFound":"Не найдено","forbidden":"Запрещено"}

// 5. async loading + hot reload
const loaded = await I18n.load({ localesPath: dir('locales'), currentLocale: 'en' })
console.log(loaded.t('nav.home')) // Home
await loaded.reload()             // re-read from disk (e.g. on a file-watch event)
console.log(loaded.t('nav.home')) // Home
