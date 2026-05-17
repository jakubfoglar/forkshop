import type { ResolvedAliases } from "./manifest-schema.js"

/**
 * v2: tiny placeholder substituter for template content. Replaces:
 *   - {{srcPrefix}} → "" or "src/" (from detected tsconfig convention)
 *   - {{mount}}     → user's mount alias (default "@/app/forkshop")
 *
 * Engine imports in templates stay as `@forkshop/engine/*` — no rewriting
 * needed, the engine is a real npm package now.
 */
export function applyTemplatePlaceholders(content: string, aliases: ResolvedAliases): string {
  return content
    .replace(/\{\{srcPrefix\}\}/g, aliases.srcPrefix)
    .replace(/\{\{mount\}\}/g, aliases.mount)
}
