import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  __resetSnapshotForTests,
  clearSnapshot,
  readAndDiff,
} from "@forkshop/lib/file-snapshot"

let tmpdir: string

beforeEach(async () => {
  __resetSnapshotForTests()
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-snap-"))
})

afterEach(async () => {
  __resetSnapshotForTests()
  await fs.rm(tmpdir, { recursive: true, force: true })
})

describe("file-snapshot", () => {
  it("returns [] on first sighting and seeds the snapshot", async () => {
    const file = path.join(tmpdir, "a.tsx")
    await fs.writeFile(file, "hello\n", "utf8")
    const hunks = await readAndDiff(file)
    expect(hunks).toEqual([])
  })

  it("produces hunks on second read with changed content", async () => {
    const file = path.join(tmpdir, "a.tsx")
    await fs.writeFile(file, "hello\n", "utf8")
    await readAndDiff(file) // seed
    await fs.writeFile(file, "hello world\n", "utf8")
    const hunks = await readAndDiff(file)
    expect(hunks).toEqual([{ oldString: "hello\n", newString: "hello world\n" }])
  })

  it("clearSnapshot makes the next read return [] (re-seed)", async () => {
    const file = path.join(tmpdir, "a.tsx")
    await fs.writeFile(file, "hello\n", "utf8")
    await readAndDiff(file)
    clearSnapshot(file)
    await fs.writeFile(file, "different\n", "utf8")
    const hunks = await readAndDiff(file)
    expect(hunks).toEqual([])
  })

  it("snapshot is per-file (different files don't pollute each other)", async () => {
    const fileA = path.join(tmpdir, "a.tsx")
    const fileB = path.join(tmpdir, "b.tsx")
    await fs.writeFile(fileA, "AAA\n", "utf8")
    await fs.writeFile(fileB, "BBB\n", "utf8")
    await readAndDiff(fileA) // seed A
    await readAndDiff(fileB) // seed B
    await fs.writeFile(fileA, "AAA modified\n", "utf8")
    const hunksA = await readAndDiff(fileA)
    expect(hunksA).toEqual([{ oldString: "AAA\n", newString: "AAA modified\n" }])
    const hunksB = await readAndDiff(fileB)
    expect(hunksB).toEqual([]) // B unchanged → still seeded snapshot matches disk
  })
})
