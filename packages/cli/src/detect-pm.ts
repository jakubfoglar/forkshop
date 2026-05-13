import { promises as fs } from "node:fs"
import path from "node:path"

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm"

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function detectPackageManager(projectRoot: string): Promise<PackageManager> {
  if (await exists(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm"
  if (await exists(path.join(projectRoot, "yarn.lock"))) return "yarn"
  if (await exists(path.join(projectRoot, "bun.lockb"))) return "bun"
  return "npm"
}

export function buildInstallCommand(pm: PackageManager, deps: string[]): string {
  if (deps.length === 0) return ""
  const args = deps.map((d) => `'${d}'`).join(" ")
  switch (pm) {
    case "pnpm":
      return `pnpm add ${args}`
    case "yarn":
      return `yarn add ${args}`
    case "bun":
      return `bun add ${args}`
    case "npm":
      return `npm install ${args}`
  }
}
