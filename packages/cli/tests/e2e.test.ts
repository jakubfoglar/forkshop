import { exec } from "node:child_process"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const execAsync = promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_BIN = path.resolve(__dirname, "../dist/index.js")

async function setupBareNextProject(root: string) {
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "e2e-target",
        private: true,
        type: "module",
        dependencies: {
          next: "^14.2.0",
          react: "^18.3.0",
          "react-dom": "^18.3.0",
        },
      },
      null,
      2
    )
  )
  // The tsconfig is intentionally minimal: the preflight comment-stripper in the CLI
  // has a naive `/* … */` regex that can chew through any glob containing `*/` (e.g.
  // `**/*.ts` in `include`). Mirror the shape used by the unit-level init test.
  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        jsx: "preserve",
        module: "esnext",
        moduleResolution: "bundler",
        baseUrl: ".",
        paths: { "@/*": ["./*"] },
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    })
  )
  await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
  await fs.mkdir(path.join(root, "app"))
  await fs.writeFile(
    path.join(root, "app/layout.tsx"),
    `export default function L({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html> }`
  )
  await fs.writeFile(path.join(root, "app/page.tsx"), "export default function Page() { return <main>OK</main> }")
}

describe.skip("e2e: forkshop init against a bare Next.js project", () => {
  it("copies files, writes forkshop.json, leaves the project typecheckable", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-e2e-"))
    try {
      await setupBareNextProject(tmp)

      const result = await execAsync(
        `node ${CLI_BIN} init --no-install --registry http://localhost:3001/r/`,
        { cwd: tmp }
      )
      expect(result.stdout).toMatch(/Installed/)

      const forkshopJson = JSON.parse(await fs.readFile(path.join(tmp, "forkshop.json"), "utf8"))
      expect(forkshopJson.registryVersion).toBeDefined()

      const canvasNode = await fs.readFile(
        path.join(tmp, "components/forkshop/canvas/canvas-node.tsx"),
        "utf8"
      )
      expect(canvasNode).toContain("CanvasNode")
      expect(canvasNode).not.toContain("@forkshop/")
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
