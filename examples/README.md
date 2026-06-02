# examples

runnable examples for `@starkow/i18n`.

these import the package by its own name (`@starkow/i18n`), just like a real
consumer would — so build the library once first:

```sh
npm install
npm run build
```

then run either example from the repo root:

```sh
node examples/basic.mjs
node examples/advanced.mjs
```

## basic.mjs

core usage — interpolation, nested keys via dot paths, inline anchors,
pluralization with auto-injected `count`, runtime locale switching, and
`exists` / `getLanguages`.

## advanced.mjs

fallback chain + BCP-47 base fallback, the `onMissing` handler, the scoped
translator (`i18n.scope('nav')`), nested locale directories, async loading
(`I18n.load` / `reload`), and raw entities (`__r`).

## locales/

flat layout — one file per locale (`en.json`, `ru.json`). the filename is the
locale code.

## locales-nested/

nested layout — a directory per locale, and each file inside becomes a key
namespace (`ru/errors.json` → `errors.*`). flat and nested layouts can also be
mixed under one path.
