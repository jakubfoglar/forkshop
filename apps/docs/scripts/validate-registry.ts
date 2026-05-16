import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildManifest } from "forkshop/manifest-builder"

const DOCS_ROOT = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_ROOT = path.resolve(DOCS_ROOT, "../../../packages/engine")

function validateSkillPlaceholders(address: string, content: string): string[] {
  if (!address.startsWith("@forkshop/skill/")) return []

  const templatesHeading = "\n## Scaffolding templates"
  const templatesIdx = content.indexOf(templatesHeading)
  const proseRegion = templatesIdx === -1 ? content : content.slice(0, templatesIdx)

  // Strip fenced code blocks first (multi-line), then inline code spans.
  const stripped = proseRegion
    .replaceAll(/```[\s\S]*?```/g, "")
    .replaceAll(/`[^`\n]*`/g, "")

  const placeholderRe = /\{\{[a-z_][a-z0-9_.]*\}\}/gi
  const matches = stripped.match(placeholderRe) ?? []
  return matches.map(
    (match) =>
      `  ${address}\n    leaked placeholder '${match}' outside the Scaffolding templates section`,
  )
}

async function main() {
  const manifest = await buildManifest({ registryRoot: REGISTRY_ROOT })
  const knownAddresses = new Set(Object.keys(manifest.files))
  const importRe = /@forkshop\/[a-zA-Z0-9/_-]+/g
  const errors: string[] = []

  for (const [address, file] of Object.entries(manifest.files)) {
    if (file.kind !== "text") continue
    errors.push(...validateSkillPlaceholders(address, file.content))
    // Skip .md files (documentation references like @forkshop/engine are intentional)
    if (file.ext === "md") continue
    const referenced = file.content.match(importRe) ?? []
    for (const ref of referenced) {
      // @forkshop/engine is the user-facing package alias; not a manifest address
      if (ref.startsWith("@forkshop/engine")) continue
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
