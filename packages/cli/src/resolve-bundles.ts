import type { Manifest } from "./manifest-schema.js"

export interface ResolvedBundles {
  fileAddresses: string[]
  deps: string[]
  bundleNames: string[]
}

export function resolveBundles(manifest: Manifest, names: string[]): ResolvedBundles {
  const visited = new Set<string>()
  const fileSet = new Set<string>()
  const depSet = new Set<string>()

  function visit(name: string) {
    if (visited.has(name)) return
    visited.add(name)
    const bundle = manifest.bundles[name]
    if (!bundle) {
      throw new Error(
        `Unknown bundle: "${name}". Available: ${Object.keys(manifest.bundles).join(", ")}.`
      )
    }
    if (bundle.kind === "composite") {
      for (const inc of bundle.includes) visit(inc)
    } else {
      for (const item of bundle.items) fileSet.add(item)
      for (const dep of bundle.deps ?? []) depSet.add(dep)
    }
  }

  for (const name of names) visit(name)

  return {
    fileAddresses: [...fileSet],
    deps: [...depSet],
    bundleNames: [...visited].filter((n) => {
      const bundle = manifest.bundles[n]
      return bundle && bundle.kind !== "composite"
    }),
  }
}
