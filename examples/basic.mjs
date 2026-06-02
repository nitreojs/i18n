// core usage. run from the repo root with:  node examples/basic.mjs
// (run `npm run build` first — these import the package by its own name)

import { resolve } from 'node:path'
import { I18n } from '@starkow/i18n'

const i18n = new I18n({
  localesPath: resolve(import.meta.dirname, 'locales'),
  currentLocale: 'en',
  defaultLocale: 'en'
})

// interpolation
console.log(i18n.t('greeting', { name: 'Sam' })) // Hello, Sam!

// nested keys via dot paths
console.log(i18n.t('nav.settings')) // Settings

// inline anchor — "welcome" embeds the "greeting" translation, then interpolates
console.log(i18n.t('welcome', { name: 'Sam' })) // Hello, Sam! Glad to see you.

// pluralization — `count` is auto-injected into the scope
console.log(i18n.__n(1, 'apple')) // 1 apple
console.log(i18n.__n(5, 'apple')) // 5 apples

// switch locale at runtime
i18n.locale = 'ru'
console.log(i18n.t('greeting', { name: 'Аня' })) // Привет, Аня!
console.log(i18n.__n(2, 'apple')) // 2 яблока (correct russian plural)
console.log(i18n.__n(5, 'apple')) // 5 яблок

// introspection
console.log(i18n.exists('nav.home'))   // true
console.log(i18n.exists('nav.missing')) // false
console.log(i18n.getLanguages())        // [ 'en', 'ru' ]
