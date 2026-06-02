export interface LookupResult {
  value: unknown
  found: boolean
}

export const lookup = (object: Record<string, any>, path: string): LookupResult => {
  const keys = path.split('.')

  let result: any = object

  for (const key of keys) {
    if (result === null || typeof result !== 'object') {
      return { value: path, found: false }
    }

    result = result[key]

    if (result === undefined) {
      return { value: path, found: false }
    }
  }

  return { value: result, found: true }
}
