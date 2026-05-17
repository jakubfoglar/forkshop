export type DriftState =
  | "unchanged"
  | "upstream-drift"
  | "local-drift"
  | "both-drift"
  | "missing-on-disk"

export interface FileTriple {
  address: string
  lockSha: string
  manifestSha: string
  diskSha: string | undefined
}

export function classifyDrift(triple: FileTriple): DriftState {
  if (triple.diskSha === undefined) return "missing-on-disk"
  const upstreamMoved = triple.lockSha !== triple.manifestSha
  const localMoved = triple.lockSha !== triple.diskSha
  if (!upstreamMoved && !localMoved) return "unchanged"
  if (upstreamMoved && !localMoved) return "upstream-drift"
  if (!upstreamMoved && localMoved) return "local-drift"
  return "both-drift"
}
