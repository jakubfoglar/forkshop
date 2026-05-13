import { promises as fs } from "node:fs"
import path from "node:path"
import { fetchManifest } from "../fetch-manifest.js"
import { readFogmaJson } from "../fogma-json.js"
import type { Manifest } from "../manifest-schema.js"
import { rewriteImports } from "../rewrite.js"
import { unifiedDiff } from "../unified-diff.js"

export interface DiffOptions {
  projectRoot: string
  path: string
  manifest?: Manifest
  registryUrl?: string
}

export interface DiffResult {
  exitCode: 0 | 1 | 2
  diff: string
  message?: string
}

function aliasMapForRewrite(aliases: {
  components: string
  kits: string
  hooks: string
  lib: string
  api: string
  tailwind: string
}) {
  return {
    "@fogma/components": aliases.components,
    "@fogma/kits": aliases.kits,
    "@fogma/hooks": aliases.hooks,
    "@fogma/lib": aliases.lib,
    "@fogma/api": aliases.api,
    "@fogma/tailwind": aliases.tailwind,
  }
}

export async function runDiff(options: DiffOptions): Promise<DiffResult> {
  const fogmaJson = await readFogmaJson(options.projectRoot)
  if (!fogmaJson) {
    return { exitCode: 2, diff: "", message: "Run `fogma init` first." }
  }

  const absolute = path.isAbsolute(options.path)
    ? options.path
    : path.join(options.projectRoot, options.path)
  const workspaceRelative = path.relative(options.projectRoot, absolute).split(path.sep).join("/")

  const entry = Object.entries(fogmaJson.files).find(([, info]) => info.dest === workspaceRelative)
  if (!entry) {
    return {
      exitCode: 2,
      diff: "",
      message: `This path isn't in fogma.json: ${workspaceRelative}. Add it manually under "files", or rerun init.`,
    }
  }
  const [address] = entry

  const manifest = options.manifest ?? (await fetchManifest(options.registryUrl ?? fogmaJson.registryUrl))
  const upstream = manifest.files[address]
  if (!upstream) {
    return {
      exitCode: 0,
      diff: "",
      message: `This file was removed from the registry in version ${manifest.version}. Your local copy is preserved.`,
    }
  }
  if (upstream.kind !== "text") {
    return { exitCode: 0, diff: "", message: "Binary file — diff not supported." }
  }

  const rewritten = rewriteImports(upstream.content, aliasMapForRewrite(fogmaJson.aliases))
  const local = await fs.readFile(absolute, "utf8")

  if (local === rewritten) return { exitCode: 0, diff: "" }

  const diff = unifiedDiff(local, rewritten, {
    from: `${workspaceRelative} (local)`,
    to: `${workspaceRelative} (upstream)`,
  })
  return { exitCode: 1, diff }
}
