import type { ManifestFile, ResolvedAliases } from "./manifest-schema.js"

/**
 * In v2 every file in the manifest carries an explicit destOverride.
 * The resolver applies the {aliases.mount} placeholder and the srcPrefix
 * convention. No more longest-prefix-match across 6 aliases.
 */
export function resolveDestination(
  _address: string,
  file: ManifestFile,
  aliases: ResolvedAliases
): string {
  const template = file.destOverride
  if (!template) {
    throw new Error(`v2 manifest file is missing destOverride (kind=${file.kind})`)
  }
  return applyDestPlaceholders(template, aliases)
}

function applyDestPlaceholders(template: string, aliases: ResolvedAliases): string {
  let next = template.replace(/\{aliases\.mount\}/g, aliases.mount)
  next = workspaceRelative(next, aliases)
  return next
}

function workspaceRelative(value: string, aliases: ResolvedAliases): string {
  // Strip leading "@/" (the user-facing alias) and prepend srcPrefix so the
  // result is a workspace-relative on-disk path. srcPrefix is only applied to
  // user code (app/lib paths); config/static files (., public/, etc.) are unaffected.
  if (value.startsWith("@/")) {
    const stripped = value.replace(/^@\//, "")
    return aliases.srcPrefix + stripped
  }
  return value
}
