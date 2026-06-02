const rulesCache = new Map<string, Intl.PluralRules>()

const getRules = (locale: string) => {
  let rules = rulesCache.get(locale)

  if (rules === undefined) {
    rules = new Intl.PluralRules(locale)
    rulesCache.set(locale, rules)
  }

  return rules
}

export const selectPluralTemplate = (
  obj: Record<string, any>,
  count: number,
  locale: string
): any => {
  const rule = getRules(locale).select(count)

  const byRule: Partial<Record<Intl.LDMLPluralRule, any>> = {
    zero: obj.zero ?? obj.other ?? obj.many,
    one: obj.one ?? obj.other,
    two: obj.two ?? obj.few ?? obj.many,
    few: obj.few ?? obj.many,
    many: obj.many ?? obj.other,
    other: obj.other ?? obj.many
  }

  return byRule[rule] ?? obj.many ?? obj.other
}
