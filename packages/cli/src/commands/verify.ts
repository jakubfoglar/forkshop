import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import pc from "picocolors"
import { checkConfig } from "../verify/check-config.js"

export type VerifyOptions = {
  cwd?: string
}

export type VerifyResult = {
  ok: boolean
  issues: Array<{ file: string; message: string }>
}

export async function runVerify(options: VerifyOptions = {}): Promise<VerifyResult> {
  const cwd = options.cwd ?? process.cwd()
  const issues: VerifyResult["issues"] = []

  // Subsequent tasks add the actual checks. Skeleton just confirms forkshop.json exists.
  try {
    await readFile(resolve(cwd, "forkshop.json"), "utf8")
  } catch {
    issues.push({ file: "forkshop.json", message: "missing — run `npx forkshop init` first" })
  }

  issues.push(...(await checkConfig({ cwd })))

  if (issues.length === 0) {
    console.log(pc.green("✓ Forkshop install is consistent."))
    return { ok: true, issues: [] }
  }

  for (const i of issues) {
    console.log(pc.red(`✗ ${i.file}`))
    console.log(`    ${i.message}`)
  }
  console.log(pc.red(`✗ ${issues.length} issue(s) found.`))
  return { ok: false, issues }
}
