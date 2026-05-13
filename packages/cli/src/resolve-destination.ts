import type { FogmaJson, ManifestFile } from "./manifest-schema.js"

function workspaceRelative(value: string, aliases: FogmaJson["aliases"]): string {
  if (value.startsWith(aliases.base)) {
    return value.slice(aliases.base.length)
  }
  return value.replace(/^@\//, "")
}

function applyOverride(template: string, aliases: FogmaJson["aliases"]): string {
  const substituted = template.replace(/\{aliases\.([a-zA-Z]+)\}/g, (_match, key: string) => {
    const value = (aliases as Record<string, string>)[key]
    if (value === undefined) {
      throw new Error(`destOverride template references unknown alias key: ${key}`)
    }
    return value
  })
  return workspaceRelative(substituted, aliases)
}

export function resolveDestination(
  address: string,
  file: ManifestFile,
  aliases: FogmaJson["aliases"]
): string {
  if (file.kind === "binary") {
    if (!file.destOverride) {
      throw new Error(`Binary file ${address} has no destOverride`)
    }
    return applyOverride(file.destOverride, aliases)
  }
  if (file.destOverride) {
    return applyOverride(file.destOverride, aliases)
  }

  const namespaceMap: Record<string, string> = {
    "@fogma/components": aliases.components,
    "@fogma/kits": aliases.kits,
    "@fogma/hooks": aliases.hooks,
    "@fogma/lib": aliases.lib,
    "@fogma/api": aliases.api,
    "@fogma/tailwind": aliases.tailwind,
  }
  const sortedPrefixes = Object.keys(namespaceMap).sort((a, b) => b.length - a.length)
  for (const prefix of sortedPrefixes) {
    if (address === prefix || address.startsWith(`${prefix}/`)) {
      const suffix = address.slice(prefix.length)
      const replacement = namespaceMap[prefix]
      if (replacement === undefined) continue
      const target = `${replacement}${suffix}.${file.ext}`
      return workspaceRelative(target, aliases)
    }
  }
  throw new Error(`Cannot resolve destination for ${address} (no matching alias prefix)`)
}
