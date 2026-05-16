import { describe, it, expect } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import { findIconLibImports } from "./check-no-icon-libs.js"

async function mkdtemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), "engine-iconlibs-"))
}

describe("findIconLibImports", () => {
  it("returns empty list when source uses no banned icon libs", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "a.ts"), `import { foo } from "@forkshop/lib/foo"\n`)
    const violations = await findIconLibImports(dir)
    expect(violations).toEqual([])
  })

  it("flags lucide-react imports", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "a.tsx"), `import { X } from "lucide-react"\n`)
    const violations = await findIconLibImports(dir)
    expect(violations).toHaveLength(1)
    expect(violations[0].match).toContain("lucide-react")
  })

  it("flags iconoir-react, @heroicons, react-icons, phosphor-react", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "a.tsx"), [
      `import { X } from "iconoir-react"`,
      `import { Foo } from "@heroicons/react/24/outline"`,
      `import { Bar } from "react-icons/fa"`,
      `import { Baz } from "phosphor-react"`,
    ].join("\n"))
    const violations = await findIconLibImports(dir)
    expect(violations).toHaveLength(4)
  })

  it("ignores @central-icons-react", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(
      path.join(dir, "a.tsx"),
      `import X from "@central-icons-react/square-outlined-radius-0-stroke-2/X"\n`,
    )
    const violations = await findIconLibImports(dir)
    expect(violations).toEqual([])
  })
})
