import { diffLines } from "diff"

export type Hunk = { oldString?: string; newString?: string }

// Group consecutive removed+added line blocks from jsdiff's diffLines output
// into a single { oldString, newString } hunk per edit. Pure additions become
// { newString }; pure removals become { oldString }.
export function diffToHunks(prev: string, next: string): Hunk[] {
  const changes = diffLines(prev, next)
  const hunks: Hunk[] = []
  let pendingOld: string | undefined
  for (const change of changes) {
    if (change.removed) {
      pendingOld = (pendingOld ?? "") + change.value
    } else if (change.added) {
      hunks.push({ oldString: pendingOld, newString: change.value })
      pendingOld = undefined
    } else {
      if (pendingOld !== undefined) hunks.push({ oldString: pendingOld })
      pendingOld = undefined
    }
  }
  if (pendingOld !== undefined) hunks.push({ oldString: pendingOld })
  return hunks
}
