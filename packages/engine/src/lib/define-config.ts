import { forkshopConfigSchema, type ParsedForkshopConfig } from "@forkshop/lib/schemas"
import { ZodError, type ZodIssue } from "zod"

export class ForkshopConfigError extends Error {
  public readonly issues: ZodIssue[]

  constructor(message: string, issues: ZodIssue[]) {
    super(message)
    this.name = "ForkshopConfigError"
    this.issues = issues
  }
}

/**
 * Validates a forkshop.config.tsx object at import time and returns the parsed
 * config (with defaults applied).
 *
 * Signature accepts `unknown` rather than `z.input<typeof forkshopConfigSchema>`
 * so a malformed config doesn't get filtered out by TS at the call site — the
 * whole point of this function is to surface that misuse at runtime with a
 * helpful, human-readable error. The return type carries the post-default
 * shape that the rest of the engine expects.
 */
export function defineConfig(input: unknown): ParsedForkshopConfig {
  const result = forkshopConfigSchema.safeParse(input)
  if (!result.success) {
    const detail = formatZodError(result.error)
    throw new ForkshopConfigError(
      `ForkshopConfigError: invalid forkshop.config.tsx shape.\n${detail}`,
      result.error.issues,
    )
  }
  return result.data
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `  at ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
}
