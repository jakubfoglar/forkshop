export type NodePosition = { x: number; y: number }
export type NodePositions = Readonly<Record<string, NodePosition>>

export function isNodePositions(value: unknown): value is NodePositions {
  if (!value || typeof value !== "object") return false
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as NodePosition).x !== "number" ||
      typeof (entry as NodePosition).y !== "number"
    ) {
      return false
    }
  }
  return true
}

export async function persistNodePositions(
  positions: NodePositions,
  endpoint = "/api/forkshop/layout",
): Promise<void> {
  if (globalThis.window === undefined) return
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positions }),
    })
  } catch {
    // ignore network errors; positions stay in memory
  }
}
