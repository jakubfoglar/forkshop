import type { ClassLookupEntry, TokenRegistry } from "./token-registry.js"

export type AppliedToken = {
  className: string
  category: ClassLookupEntry["category"]
  prefix: string
  tokenName: string
  entry: ClassLookupEntry["entry"]
}

export type InspectionResult = {
  tagName: string
  textPreview: string
  classNames: string[]
  applied: AppliedToken[]
  unknownClasses: string[]
}

const TEXT_PREVIEW_LIMIT = 64

export function inspectElement(
  element: Element,
  classLookup: TokenRegistry["classLookup"],
): InspectionResult {
  const rawClass = element.getAttribute("class") ?? ""
  const classNames = rawClass.split(/\s+/).filter(Boolean)

  const applied: AppliedToken[] = []
  const unknownClasses: string[] = []
  for (const className of classNames) {
    const lookup = classLookup[className]
    if (lookup) {
      applied.push({
        className,
        category: lookup.category,
        prefix: lookup.prefix,
        tokenName: lookup.tokenName,
        entry: lookup.entry,
      })
    } else {
      unknownClasses.push(className)
    }
  }

  const text = (element.textContent ?? "").replaceAll(/\s+/g, " ").trim()
  const textPreview =
    text.length > TEXT_PREVIEW_LIMIT ? `${text.slice(0, TEXT_PREVIEW_LIMIT - 1)}…` : text

  return {
    tagName: element.tagName.toLowerCase(),
    textPreview,
    classNames,
    applied,
    unknownClasses,
  }
}
