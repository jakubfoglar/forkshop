export type SnapTarget = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type SnapGuide = {
  axis: "x" | "y"
  position: number
  from: number
  to: number
  targetId: string
}

export type SnapResult = {
  x: number
  y: number
  guides: SnapGuide[]
}

type AxisCandidate = {
  ourEdge: number
  theirEdge: number
  delta: number
  targetMin: number
  targetMax: number
  targetId: string
}

const SNAP_SCREEN_PIXELS = 8

export function snapPixelsAt(zoom: number): number {
  return SNAP_SCREEN_PIXELS / Math.max(zoom, 0.001)
}

export function applySnap(
  dragged: SnapTarget,
  others: readonly SnapTarget[],
  threshold: number,
): SnapResult {
  const draggedLeft = dragged.x
  const draggedCenterX = dragged.x + dragged.width / 2
  const draggedRight = dragged.x + dragged.width
  const draggedTop = dragged.y
  const draggedCenterY = dragged.y + dragged.height / 2
  const draggedBottom = dragged.y + dragged.height

  const xCandidates: AxisCandidate[] = []
  const yCandidates: AxisCandidate[] = []

  for (const other of others) {
    if (other.id === dragged.id) continue
    const otherLeft = other.x
    const otherCenterX = other.x + other.width / 2
    const otherRight = other.x + other.width
    const otherTop = other.y
    const otherCenterY = other.y + other.height / 2
    const otherBottom = other.y + other.height
    const targetMinX = Math.min(otherLeft, draggedLeft)
    const targetMaxX = Math.max(otherRight, draggedRight)
    const targetMinY = Math.min(otherTop, draggedTop)
    const targetMaxY = Math.max(otherBottom, draggedBottom)

    const xPairs: readonly (readonly [number, number])[] = [
      [draggedLeft, otherLeft],
      [draggedLeft, otherCenterX],
      [draggedLeft, otherRight],
      [draggedCenterX, otherLeft],
      [draggedCenterX, otherCenterX],
      [draggedCenterX, otherRight],
      [draggedRight, otherLeft],
      [draggedRight, otherCenterX],
      [draggedRight, otherRight],
    ]
    for (const [ourEdge, theirEdge] of xPairs) {
      const delta = theirEdge - ourEdge
      if (Math.abs(delta) <= threshold) {
        xCandidates.push({
          ourEdge,
          theirEdge,
          delta,
          targetMin: targetMinY,
          targetMax: targetMaxY,
          targetId: other.id,
        })
      }
    }

    const yPairs: readonly (readonly [number, number])[] = [
      [draggedTop, otherTop],
      [draggedTop, otherCenterY],
      [draggedTop, otherBottom],
      [draggedCenterY, otherTop],
      [draggedCenterY, otherCenterY],
      [draggedCenterY, otherBottom],
      [draggedBottom, otherTop],
      [draggedBottom, otherCenterY],
      [draggedBottom, otherBottom],
    ]
    for (const [ourEdge, theirEdge] of yPairs) {
      const delta = theirEdge - ourEdge
      if (Math.abs(delta) <= threshold) {
        yCandidates.push({
          ourEdge,
          theirEdge,
          delta,
          targetMin: targetMinX,
          targetMax: targetMaxX,
          targetId: other.id,
        })
      }
    }
  }

  let bestX: AxisCandidate | undefined
  for (const candidate of xCandidates) {
    if (!bestX || Math.abs(candidate.delta) < Math.abs(bestX.delta)) bestX = candidate
  }
  let bestY: AxisCandidate | undefined
  for (const candidate of yCandidates) {
    if (!bestY || Math.abs(candidate.delta) < Math.abs(bestY.delta)) bestY = candidate
  }

  const snappedX = bestX ? dragged.x + bestX.delta : dragged.x
  const snappedY = bestY ? dragged.y + bestY.delta : dragged.y

  const guides: SnapGuide[] = []
  if (bestX) {
    guides.push({
      axis: "x",
      position: bestX.theirEdge,
      from: bestX.targetMin,
      to: bestX.targetMax,
      targetId: bestX.targetId,
    })
  }
  if (bestY) {
    guides.push({
      axis: "y",
      position: bestY.theirEdge,
      from: bestY.targetMin,
      to: bestY.targetMax,
      targetId: bestY.targetId,
    })
  }

  return { x: snappedX, y: snappedY, guides }
}
