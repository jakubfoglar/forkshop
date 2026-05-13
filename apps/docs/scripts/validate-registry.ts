import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildManifest } from "fogma/manifest-builder"

const DOCS_ROOT = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_ROOT = path.resolve(DOCS_ROOT, "../../../packages/registry")

async function main() {
  const manifest = await buildManifest({ registryRoot: REGISTRY_ROOT })
  const knownAddresses = new Set(Object.keys(manifest.files))
  const importRe = /@fogma\/[a-zA-Z0-9/_-]+/g
  const errors: string[] = []

  for (const [address, file] of Object.entries(manifest.files)) {
    if (file.kind !== "text") continue
    // Skip .md files (documentation references like @fogma/registry are intentional)
    if (file.ext === "md") continue
    const referenced = file.content.match(importRe) ?? []
    for (const ref of referenced) {
      // @fogma/registry is the user-facing package alias; not a manifest address
      if (ref.startsWith("@fogma/registry")) continue
      if (!knownAddresses.has(ref)) {
        errors.push(`  ${address}\n    references missing address: ${ref}`)
      }
    }
  }

  for (const [name, bundle] of Object.entries(manifest.bundles)) {
    if (bundle.kind === "composite") {
      for (const inc of bundle.includes) {
        if (!manifest.bundles[inc]) {
          errors.push(`  bundle ${name}\n    includes missing bundle: ${inc}`)
        }
      }
    } else {
      for (const item of bundle.items) {
        if (!manifest.files[item]) {
          errors.push(`  bundle ${name}\n    item missing from files: ${item}`)
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error("Registry validation failed:\n")
    for (const error of errors) console.error(error)
    process.exit(1)
  }
  console.log(
    `OK. ${Object.keys(manifest.files).length} files, ${Object.keys(manifest.bundles).length} bundles, all references resolved.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
