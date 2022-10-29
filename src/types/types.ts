export type Either<T extends string | string[], L = string, R = string[]> = T extends L ? L : R

export type MaybeArray<T> = T | T[]
