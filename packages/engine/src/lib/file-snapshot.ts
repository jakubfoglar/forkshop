import { promises as fs } from "node:fs"
import { diffToHunks, type Hunk } from "@forkshop/lib/diff-to-hunks"

declare global {
  // eslint-disable-next-line no-var
  var __forkshopFileSnapshot: Map<string, string> | undefined
}

const snapshot: Map<string, string> = (globalThis.__forkshopFileSnapshot ??= new Map())

// Read absolutePath from disk and diff against the cached snapshot. On first
// sighting (no prior snapshot for this path) returns [] and seeds the cache —
// the engine surfaces frame-level activity only for that first event. From the
// second invocation onward, returns hunk pairs the iframe relay decorates.
export async function readAndDiff(absolutePath: string): Promise<Hunk[]> {
  let next: string
  try {
    next = await fs.readFile(absolutePath, "utf8")
  } catch {
    // File missing (race with delete, etc.) — clear stale snapshot and return [].
    snapshot.delete(absolutePath)
    return []
  }
  const prev = snapshot.get(absolutePath)
  snapshot.set(absolutePath, next)
  if (prev === undefined) return []
  return diffToHunks(prev, next)
}

export function clearSnapshot(absolutePath: string): void {
  snapshot.delete(absolutePath)
}

// Test helper. Not exported from the engine's public surface.
export function __resetSnapshotForTests(): void {
  snapshot.clear()
}
