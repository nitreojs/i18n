export const escapeRegExp = (data: string) => data.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
