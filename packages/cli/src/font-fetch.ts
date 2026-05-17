import { promises as fs } from "node:fs"
import path from "node:path"

export interface FetchFontOptions {
  primaryUrl: string // resolved manifest binary URL
  fallbackUrl: string // unpkg URL keyed to engineVersion
  destAbsolute: string // absolute path to write
}

export interface FetchFontResult {
  source: "primary" | "fallback"
  bytes: number
}

async function tryFetch(url: string): Promise<Buffer | undefined> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    return undefined
  }
  if (!response.ok) return undefined
  return Buffer.from(await response.arrayBuffer())
}

export async function fetchFontTo(options: FetchFontOptions): Promise<FetchFontResult> {
  const { primaryUrl, fallbackUrl, destAbsolute } = options
  let buffer = await tryFetch(primaryUrl)
  let source: "primary" | "fallback" = "primary"
  if (!buffer) {
    buffer = await tryFetch(fallbackUrl)
    source = "fallback"
  }
  if (!buffer) {
    throw new Error(
      `Could not fetch font from registry (${primaryUrl}) or fallback (${fallbackUrl}). ` +
        `Check network connectivity, or pass --registry <url> with an alternate registry.`
    )
  }
  await fs.mkdir(path.dirname(destAbsolute), { recursive: true })
  await fs.writeFile(destAbsolute, buffer)
  return { source, bytes: buffer.length }
}
