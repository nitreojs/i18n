## @starkow/i18n

### why?

- i want to make it by my own
- i didn't manage to find any good i18n packages
- yeah

### usage

#### locales/ru.json

```json
{
  "foo": {
    "bar": [
      {
        "baz": "quix, {{hello}}"
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

#### src/main.ts

```ts
import { resolve } from 'node:path'

import { I18n } from '@starkow/i18n'

const i18n = new I18n({
  localesPath: resolve(__dirname, 'locales'),
  currentLocale: 'ru',
  defaultLocale: 'en'
})

console.log(i18n.__('foo.bar.0.baz', { hello: 'world!' })) // "quix, world!" 

console.log(i18n.__n(1, 'declension.apple')) // "яблоко"
console.log(i18n.__n(3, 'declension.apple')) // "яблока"
console.log(i18n.__n(7, 'declension.apple')) // "яблок"
```

## reference

### `new I18n(options)`, `I18n.init(options)`, `I18n.create(options)`

#### `options`

> All of these options are **not required** _on initialization_, however `localesPath` and `currentLocale` are
> **required** when getting a translation

| key              | type               | description                                                                              |
|------------------|--------------------|------------------------------------------------------------------------------------------|
| `localesPath`    | `string`           | Path to locales                                                                          |
| `defaultLocale`  | `string`           | Locale which will be used in case current locale was not found                           |
| `currentLocale`  | `string`           | Current locale                                                                           |
| `tags`           | `[string, string]` | Render templates tags                                                                    |
| `throwOnFailure` | `boolean`          | Should the package throw an error if it fails to find a translation?                     |
| `parser`         | `Parser`           | A function which is called when contents of a file are read                              |
| `extensions`     | `string[]`         | List of accepted file extensions (or an empty one if all files extensions are accepted)  |

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

### `tags`

> Returns a list of render templates tags

Returns: `[string, string]`

```ts
i18n.tags = ['{', '}']
```

### `throwOnFailure`

> Returns whether the package will throw an error if it fails to find a translation

Returns: `boolean`

```ts
i18n.throwOnFailure = true
```

### `parser`

> Returns a function which is called when contents of a file are read

Returns: `Parser` (`(contents: string) => Record<string, any>`)

```ts
i18n.parser = YAML.parse
```

### `extensions`

> Returns a list of accepted file extensions (or an empty one if all files extensions are accepted)

Returns: `string[]`

```ts
i18n.extension = ['json']
```

### `getLanguages()`

> Returns all the languages found in `localesPath`

Returns: `string[]`

```ts
i18n.getLanguages()
```

### `__r<T>(key: string)`

> Returns raw entity from the locale file

Returns: `T`

Aliases: `r<T>(...)`, `raw<T>(...)`

```ts
i18n.__r<string[]>('menu.purchase.buttons')
```

### `__(key: MaybeArray<string>, scope?: Scope)`

> Renders the template from the locale file

Returns: `string`

Aliases: `t(...)`, `translate(...)`

```ts
i18n.__('hello.world')
```

**Note**: `__` accepts `string[]` as the first argument which is a fallback list.
`@starkow/i18n` iterates through this list and returns the first found translation.
If it didn't find any, then returns the last key from the list

```ts
// { "bar": "quix" }
i18n.__(['foo', 'bar', 'baz']) // "quix"
```

```ts
// { "hello": "world" }
i18n.__(['foo', 'bar', 'baz']) // "baz"
```

### `__n(count: number, key: string, scope?: Scope)`

> Renders the plural template from the locale file

Returns: `string`

Aliases: `p(...)`, `plural(...)`

```ts
i18n.__n(7, 'declension.book')
```

### `__l(key: string, scope?: Scope)`

> Returns a list of all of translations for a given key in each locale

Returns: `string[]`

Aliases: `l(...)`, `list(...)`

```ts
i18n.__l('language_code')
```