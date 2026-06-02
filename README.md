## @starkow/i18n

simple yet effective i18n package

---

### ⚠️ v3 breaking changes

- **esm-only**: Node ≥20.11, `import` only — `require()` is not supported.
- **pluralization**: the plural category is now selected by `Intl.PluralRules(currentLocale)`, matching CLDR rules for the *target* locale. For many counts the output differs from v2 (e.g. Russian 21→`one`, not `many`).
- **dotted key fallback**: missing dotted keys now walk the full fallback chain instead of failing immediately.

---

### install

```sh
npm i @starkow/i18n
# yarn add @starkow/i18n
# pnpm add @starkow/i18n
```

requires Node ≥20.11 and an esm project (`"type": "module"` in package.json, or `.mjs` files).

---

### usage

#### locales/ru.json

```json
{
  "hello": "Привет, мир!",
  "foo": {
    "bar": [
      { "baz": "quix, {{hello}}" }
    ]
  },
  "inline": "uses inline: \"{{#hello}}\".",
  "apple": {
    "one": "{{count}} яблоко",
    "few": "{{count}} яблока",
    "many": "{{count}} яблок",
    "other": "{{count}} яблоки"
  }
}
```

#### src/main.ts

```ts
import { resolve } from 'node:path'
import { I18n } from '@starkow/i18n'

const i18n = new I18n({
  localesPath: resolve(import.meta.dirname, 'locales'),
  currentLocale: 'ru',
  defaultLocale: 'en'
})

i18n.__('foo.bar.0.baz', { hello: 'world!' }) // "quix, world!"
i18n.__('inline')                              // 'uses inline: "Привет, мир!".'
i18n.__n(1, 'apple')                           // "1 яблоко"
i18n.__n(3, 'apple')                           // "3 яблока"
i18n.__n(7, 'apple')                           // "7 яблок"
```

> **note**: use `import.meta.dirname` instead of `__dirname` — the latter does not exist in esm.

---

### typed keys

import your locale as a type argument to get autocomplete and compile-time key validation:

```ts
import en from './locales/en.json' // requires "resolveJsonModule": true in tsconfig
import { I18n } from '@starkow/i18n'

const i18n = new I18n<typeof en>({
  localesPath: resolve(import.meta.dirname, 'locales'),
  currentLocale: 'en'
})

i18n.t('errors.notFound') // autocompletes; typos are compile errors
```

without a type argument (`new I18n({...})`), keys remain plain `string`.

---

### async loading

use `I18n.load` to load locale files asynchronously before using the instance:

```ts
const i18n = await I18n.load({
  localesPath: resolve(import.meta.dirname, 'locales'),
  currentLocale: 'ru'
})

// hot reload (e.g. on file-watch events)
await i18n.reload()
```

---

### nested locale directories

files inside a locale subdirectory become namespaced keys — the filename is the namespace:

```
locales/
  ru/
    common.json   → keys under "common.*"
    errors.json   → keys under "errors.*"
  en.json         → flat keys at the root
```

```ts
i18n.t('common.hello')
i18n.t('errors.notFound')
```

deeper nesting nests further (`ru/admin/users.json` → `admin.users.*`).

flat (`ru.json`) and nested (`ru/`) layouts may coexist for the same locale. their keys are merged with `Object.assign`. if both define the same top-level key, the result depends on filesystem read order — avoid duplicating top-level keys across both forms.

---

### pluralization

the plural category is selected by `Intl.PluralRules(currentLocale)` (CLDR rules). locale files use the standard category keys:

```json
{
  "apple": {
    "zero":  "{{count}} apples",
    "one":   "{{count}} apple",
    "two":   "{{count}} apples",
    "few":   "{{count}} apples",
    "many":  "{{count}} apples",
    "other": "{{count}} apples"
  }
}
```

define only the categories your language needs — for Russian that's `one`, `few`, `many`, and `other`; for English just `one` and `other`.

`count` is auto-injected into the render scope, so `{{count}}` in your template resolves to the number passed to `__n`. passing an explicit `scope.count` overrides the auto-injected value.

---

### fallback resolution

when a key is not found in the current locale, resolution walks this chain:

1. `currentLocale` (e.g. `en-US`)
2. its BCP-47 primary subtag, if different (e.g. `en`)
3. `defaultLocale`
4. its BCP-47 primary subtag, if different
5. each entry in `fallbackLocale` (in order), plus their primary subtags

the base fallback only strips to the **primary** subtag (`en-US`→`en`, `zh-Hans-CN`→`zh`). to fall back to a script variant like `zh-Hans`, list it explicitly in `fallbackLocale`.

---

### onMissing

called when a key is not found in any locale:

```ts
const i18n = new I18n({
  localesPath: resolve(import.meta.dirname, 'locales'),
  currentLocale: 'en',
  onMissing: (key, locale) => {
    console.warn(`missing key "${key}" for locale "${locale}"`)
    // optionally return a fallback string:
    return `[${key}]`
  }
})
```

- returning a `string` uses it as the translation result (for `__`, `__r`, `__n`).
- returning nothing (`void`) falls through to the default behavior (returns the key as-is).
- `throwOnFailure: true` takes precedence — `onMissing` is not called when `throwOnFailure` is set.
- `exists()` is not affected by `onMissing`.

---

### inline anchors

embed another translation from the current locale using `{{#key}}`:

```json
{
  "greeting": "Привет, мир!",
  "message": "the greeting is: \"{{#greeting}}\"."
}
```

the anchor character defaults to `#` and can be changed via the `anchor` option or setter. circular references throw after `maxAnchorDepth` resolutions (default 16).

---

### scoped translator

```ts
const errors = i18n.scope('errors')

errors.t('notFound')   // resolves "errors.notFound"
errors.__('notFound')  // same
```

scopes are chainable:

```ts
i18n.scope('foo').scope('bar').t('baz') // resolves "foo.bar.baz"
```

with typed keys the prefix narrows accepted keys to those that live under that path.

---

### options

| key               | type                 | description                                                                                  |
|-------------------|----------------------|----------------------------------------------------------------------------------------------|
| `localesPath`     | `string`             | path to the locales directory                                                                |
| `currentLocale`   | `string`             | active locale                                                                                |
| `defaultLocale`   | `string`             | locale to use when `currentLocale` has no dictionary                                         |
| `fallbackLocale`  | `string \| string[]` | additional fallback locale(s) tried after `defaultLocale`                                    |
| `tags`            | `[string, string]`   | interpolation delimiters (default `['{{', '}}']`)                                            |
| `anchor`          | `string`             | single-char prefix for inline anchor references (default `'#'`)                              |
| `maxAnchorDepth`  | `number`             | max inline-anchor resolution depth before throwing (default `16`)                            |
| `throwOnFailure`  | `boolean`            | throw `I18nError` when a key is not found (default `false`)                                  |
| `onMissing`       | `OnMissing`          | `(key, locale) => string \| void` — called when a key is missing                            |
| `parser`          | `Parser`             | `(contents: string) => Record<string, any>` — custom file parser (default `JSON.parse`)      |
| `extensions`      | `string[]`           | accepted file extensions; empty array = accept all (default `[]`)                            |

all options may also be set after construction via the matching getters/setters.

---

### api

#### construction

| factory             | description                                               |
|---------------------|-----------------------------------------------------------|
| `new I18n(options)` | sync construction; loads dictionaries immediately         |
| `I18n.init(options)` / `I18n.create(options)` | aliases for `new I18n`        |
| `await I18n.load(options)` | async construction; uses `fs/promises` to load files |

#### instance methods

| method | aliases | description |
|---|---|---|
| `__(keys, scope?)` | `t`, `translate` | render a translation. `keys` may be a string or an array used as a fallback list — iterates in order, returns the first found translation; if none found, returns the last key |
| `__r(key)` | `r`, `raw` | return the raw value at `key` (object, array, or string) |
| `__n(count, key, scope?)` | `p`, `plural` | render a plural template; `count` is auto-injected into scope |
| `__l(key, scope?)` | `l`, `list` | return translations for `key` across all loaded locales |
| `exists(keys)` | — | `boolean` (or `boolean[]` for array input); not affected by `onMissing` |
| `scope(prefix)` | — | return a `ScopedTranslator` that prepends `prefix.` to all keys |
| `getLanguages()` | — | return the list of loaded locale codes |
| `reload()` | — | async; re-read all locale files from disk |

---

### license

WTFPL
