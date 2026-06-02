type Primitive = string | number | boolean | null | undefined | bigint | symbol

export type KeyPath<T> = T extends readonly (infer E)[]
  ? `${number}` | `${number}.${KeyPath<E>}`
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends Primitive
          ? K
          : K | `${K}.${KeyPath<T[K]>}`
      }[keyof T & string]
    : never

export type Key<T> = unknown extends T ? string : KeyPath<T>

export type PathValue<T, K extends string> =
  K extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T
      ? PathValue<T[Head], Rest>
      : T extends readonly (infer E)[]
        ? Head extends `${number}`
          ? PathValue<E, Rest>
          : never
        : never
    : K extends keyof T
      ? T[K]
      : T extends readonly (infer E)[]
        ? K extends `${number}` ? E : never
        : never

export type RawValue<T, K extends string> = unknown extends T ? any : PathValue<T, K>
