import { readdirSync, readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { I18nError } from './errors/index.js'

export type Parser = (contents: string) => Record<string, any>

export interface LoadResult {
  dictionaries: Record<string, any>
  languages: string[]
}

interface Source {
  locale: string
  path: string
  namespace: string[]
}

const accepted = (name: string, extensions: string[]) => {
  if (extensions.length === 0) {
    return true
  }

  return extensions.includes(name.slice(name.lastIndexOf('.') + 1))
}

const stripExtension = (name: string) => {
  const dot = name.lastIndexOf('.')

  return dot === -1 ? name : name.slice(0, dot)
}

const walkLocaleDir = (dir: string, locale: string, namespace: string[], extensions: string[], out: Source[]) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)

    if (entry.isDirectory()) {
      walkLocaleDir(full, locale, [...namespace, entry.name], extensions, out)
    } else if (entry.isFile() && accepted(entry.name, extensions)) {
      out.push({ locale, path: full, namespace: [...namespace, stripExtension(entry.name)] })
    }
  }
}

export const discoverSources = (localesPath: string, extensions: string[]): Source[] => {
  const sources: Source[] = []

  for (const entry of readdirSync(localesPath, { withFileTypes: true })) {
    const full = resolve(localesPath, entry.name)

    if (entry.isDirectory()) {
      walkLocaleDir(full, entry.name, [], extensions, sources)
    } else if (entry.isFile() && accepted(entry.name, extensions)) {
      sources.push({ locale: stripExtension(entry.name), path: full, namespace: [] })
    }
  }

  return sources
}

const walkLocaleDirAsync = async (dir: string, locale: string, namespace: string[], extensions: string[], out: Source[]) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)

    if (entry.isDirectory()) {
      await walkLocaleDirAsync(full, locale, [...namespace, entry.name], extensions, out)
    } else if (entry.isFile() && accepted(entry.name, extensions)) {
      out.push({ locale, path: full, namespace: [...namespace, stripExtension(entry.name)] })
    }
  }
}

const discoverSourcesAsync = async (localesPath: string, extensions: string[]): Promise<Source[]> => {
  const sources: Source[] = []

  for (const entry of await readdir(localesPath, { withFileTypes: true })) {
    const full = resolve(localesPath, entry.name)

    if (entry.isDirectory()) {
      await walkLocaleDirAsync(full, entry.name, [], extensions, sources)
    } else if (entry.isFile() && accepted(entry.name, extensions)) {
      sources.push({ locale: stripExtension(entry.name), path: full, namespace: [] })
    }
  }

  return sources
}

const setNamespaced = (root: Record<string, any>, namespace: string[], data: Record<string, any>) => {
  if (namespace.length === 0) {
    Object.assign(root, data)

    return
  }

  let node = root

  for (let i = 0; i < namespace.length - 1; i += 1) {
    node[namespace[i]] ??= {}
    node = node[namespace[i]]
  }

  node[namespace[namespace.length - 1]] = data
}

const assemble = (sources: Source[], parsed: Record<string, any>[]): LoadResult => {
  const dictionaries: Record<string, any> = {}
  const languages: string[] = []

  sources.forEach((source, index) => {
    if (!languages.includes(source.locale)) {
      languages.push(source.locale)
    }

    dictionaries[source.locale] ??= {}
    setNamespaced(dictionaries[source.locale], source.namespace, parsed[index])
  })

  if (Object.keys(dictionaries).length === 0) {
    throw new I18nError('zero dictionaries found')
  }

  return { dictionaries, languages }
}

export const loadDictionariesSync = (localesPath: string, extensions: string[], parser: Parser): LoadResult => {
  const sources = discoverSources(localesPath, extensions)
  const parsed = sources.map((source) => parser(readFileSync(source.path, 'utf8')))

  return assemble(sources, parsed)
}

export const loadDictionariesAsync = async (localesPath: string, extensions: string[], parser: Parser): Promise<LoadResult> => {
  const sources = await discoverSourcesAsync(localesPath, extensions)
  const contents = await Promise.all(sources.map((source) => readFile(source.path, 'utf8')))
  const parsed = contents.map((content) => parser(content))

  return assemble(sources, parsed)
}
