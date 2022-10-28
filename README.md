## @starkow/i18n

### why?

- i want to make it by my own
- i didn't manage to find any good i18n packages
- yeah

### usage

```json
/// file: locales/en.json
{
  "foo": {
    "bar": [
      {
        "baz": "quix, <<hello>>"
      }
    ]
  },
  "declensions": {
    "apple": {
      "one": "яблоко",
      "few": "яблока",
      "many": "яблок",
      "other": "яблоки"
    }
  }
}
```

```ts
/// file: src/main.ts

import { resolve } from 'node:path'

import { I18n } from '@starkow/i18n'

const i18n = new I18n({
  // INFO: path to *.json locale files
  localesPath: resolve(__dirname, 'locales'),
  
  // INFO: locale we will be using
  currentLocale: 'ru',
  
  // INFO: locale we'll use if `currentLocale` fails
  defaultLocale: 'en',
  
  // INFO: tags for `micromustache` package, used in render templates
  tags: ['<<', '>>']
})

// INFO: changing `currentLocale`
i18n.locale = 'jp'

// INFO: `i18n.__` is the same as `i18n.t`
console.log(i18n.__('foo.bar.0.baz', { hello: 'world!' })) // "quix, world!", "<<hello>>" was replaced by "world!" 

// INFO: `i18n.__n` is the same as `i18n.plural`
console.log(i18n.__n(1, 'declension.apple')) // "яблоко"
console.log(i18n.__n(3, 'declension.apple')) // "яблока"
console.log(i18n.__n(7, 'declension.apple')) // "яблок"
```

## reference

### `locale`

> Returns current locale

Returns: `string | undefined`

```js
i18n.locale
```

### `defaultLocale`

> Returns default locale - a locale which will be used in case current locale returns nothing

Returns: `string | undefined`

```js
i18n.defaultLocale
```

### `localesPath`

> Returns path to locales

Returns: `string | undefined`

```js
i18n.localesPath
```

### `__r<T>(key: string)`

> Returns raw entity from the JSON file

Returns: `T`

Aliases: `raw<T>(...)`

```ts
i18n.__r<string[]>('menu.purchase.buttons')
```

### `__(key: string, scope?: Scope, default_?: string)`

> Renders the template from the locale file

Returns: `string`

Aliases: `t(...)`

```ts
i18n.__('hello.world')
```

### `__n(count: number, key: string, scope?: Scope)`

> Renders the plural template from the locale file

Returns: `string`

Aliases: `plural(...)`

```ts
i18n.__n(7, 'declension.book')
```

### `__l(key: string, scope?: Scope)`

> Returns a list of all of translations for a given key in each locale

Returns: `string[]`

Aliases: `list(...)`

```ts
i18n.__l('language_code')
```