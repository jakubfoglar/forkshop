/**
 * Minimal line-level unified-diff emitter. Adequate for showing source-file
 * differences in the CLI; not a fully-featured patch generator.
 */

export interface DiffOptions {
  from: string
  to: string
  contextLines?: number
}

export function unifiedDiff(a: string, b: string, options: DiffOptions): string {
  if (a === b) return ""
  const aLines = a.split("\n")
  const bLines = b.split("\n")

  const context = options.contextLines ?? 3
  const ops = lcsDiff(aLines, bLines)

  const lines: string[] = []
  lines.push(`--- ${options.from}`)
  lines.push(`+++ ${options.to}`)

  let i = 0
  while (i < ops.length) {
    if (ops[i]?.kind === "equal") {
      i++
      continue
    }
    const hunkStart = Math.max(0, i - context)
    let hunkEnd = i
    while (hunkEnd < ops.length) {
      if (ops[hunkEnd]?.kind === "equal") {
        let nextChange = hunkEnd
        while (nextChange < ops.length && ops[nextChange]?.kind === "equal") nextChange++
        if (nextChange - hunkEnd >= 2 * context) {
          hunkEnd = hunkEnd + context
          break
        }
        hunkEnd = nextChange
      } else {
        hunkEnd++
      }
    }
    hunkEnd = Math.min(hunkEnd, ops.length)

    const hunkOps = ops.slice(hunkStart, hunkEnd)
    const firstOp = hunkOps[0]
    if (!firstOp) {
      i = hunkEnd
      continue
    }
    const aStart = firstOp.aIdx + 1
    const bStart = firstOp.bIdx + 1
    const aCount = hunkOps.filter((o) => o.kind !== "add").length
    const bCount = hunkOps.filter((o) => o.kind !== "remove").length
    lines.push(`@@ -${aStart},${aCount} +${bStart},${bCount} @@`)
    for (const op of hunkOps) {
      const prefix = op.kind === "add" ? "+" : op.kind === "remove" ? "-" : " "
      lines.push(`${prefix}${op.line}`)
    }
    i = hunkEnd
  }

  return lines.join("\n") + "\n"
}

interface DiffOp {
  kind: "equal" | "add" | "remove"
  line: string
  aIdx: number
  bIdx: number
}

function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const aLine = a[i]
      const bLine = b[j]
      const dpRowNext = dp[i + 1]
      const dpRow = dp[i]
      if (!dpRowNext || !dpRow) continue
      if (aLine === bLine) dpRow[j] = (dpRowNext[j + 1] ?? 0) + 1
      else dpRow[j] = Math.max(dpRowNext[j] ?? 0, dpRow[j + 1] ?? 0)
    }
  }
  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    const aLine = a[i]
    const bLine = b[j]
    if (aLine === undefined || bLine === undefined) break
    if (aLine === bLine) {
      ops.push({ kind: "equal", line: aLine, aIdx: i, bIdx: j })
      i++
      j++
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ kind: "remove", line: aLine, aIdx: i, bIdx: j })
      i++
    } else {
      ops.push({ kind: "add", line: bLine, aIdx: i, bIdx: j })
      j++
    }
  }
  while (i < m) {
    const aLine = a[i]
    if (aLine === undefined) break
    ops.push({ kind: "remove", line: aLine, aIdx: i, bIdx: j })
    i++
  }
  while (j < n) {
    const bLine = b[j]
    if (bLine === undefined) break
    ops.push({ kind: "add", line: bLine, aIdx: i, bIdx: j })
    j++
  }
  return ops
}
