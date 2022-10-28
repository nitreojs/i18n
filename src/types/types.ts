export type EitherStringArray<T extends string | string[]> = T extends string ? string : string[]

export type MaybeArray<T> = T | T[]
