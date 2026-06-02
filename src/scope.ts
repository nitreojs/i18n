import type { Scope } from 'micromustache'

import type { I18n } from './i18n.js'
import type { Key, MaybeArray, PathValue, RawValue } from './types/index.js'

export interface ScopedTranslator<T> {
  t (keys: MaybeArray<Key<T>>, scope?: Scope): string
  __ (keys: MaybeArray<Key<T>>, scope?: Scope): string
  translate (keys: MaybeArray<Key<T>>, scope?: Scope): string
  r <K extends Key<T>> (key: K): RawValue<T, K>
  __r <K extends Key<T>> (key: K): RawValue<T, K>
  raw <K extends Key<T>> (key: K): RawValue<T, K>
  p (count: number, key: Key<T>, scope?: Scope): string
  __n (count: number, key: Key<T>, scope?: Scope): string
  plural (count: number, key: Key<T>, scope?: Scope): string
  l (key: Key<T>, scope?: Scope): string[]
  __l (key: Key<T>, scope?: Scope): string[]
  list (key: Key<T>, scope?: Scope): string[]
  exists <K extends MaybeArray<Key<T>>> (keys: K): K extends readonly any[] ? boolean[] : boolean
  scope <P extends Key<T>> (prefix: P): ScopedTranslator<PathValue<T, P>>
}

export const createScope = <Parent, T> (i18n: I18n<Parent>, prefix: string): ScopedTranslator<T> => {
  const key = (value: string) => `${prefix}.${value}`
  const keys = (value: MaybeArray<string>) =>
    (Array.isArray(value) ? value.map(key) : key(value)) as any

  return {
    t: (k, scope) => i18n.t(keys(k as any), scope),
    __: (k, scope) => i18n.__(keys(k as any), scope),
    translate: (k, scope) => i18n.t(keys(k as any), scope),
    r: (k) => i18n.r(key(k as any) as any) as any,
    __r: (k) => i18n.__r(key(k as any) as any) as any,
    raw: (k) => i18n.r(key(k as any) as any) as any,
    p: (count, k, scope) => i18n.p(count, key(k as any) as any, scope),
    __n: (count, k, scope) => i18n.__n(count, key(k as any) as any, scope),
    plural: (count, k, scope) => i18n.p(count, key(k as any) as any, scope),
    l: (k, scope) => i18n.l(key(k as any) as any, scope),
    __l: (k, scope) => i18n.__l(key(k as any) as any, scope),
    list: (k, scope) => i18n.l(key(k as any) as any, scope),
    exists: (k) => i18n.exists(keys(k as any)) as any,
    scope: (nested) => createScope(i18n, key(nested as any))
  }
}
