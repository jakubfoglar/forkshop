#!/usr/bin/env node
// Reads the current @forkshop/engine version from packages/engine/package.json
// and rewrites apps/test/package.json so @forkshop/engine and forkshop both
// pin to ^<version>. Idempotent. Exits non-zero on parse failure.
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const enginePkgPath = resolve(root, "packages/engine/package.json")
const testPkgPath = resolve(root, "apps/test/package.json")

const enginePkg = JSON.parse(readFileSync(enginePkgPath, "utf8"))
const testPkg = JSON.parse(readFileSync(testPkgPath, "utf8"))

const version = enginePkg.version
if (!version) {
  console.error("bump-test-pins: could not read version from packages/engine/package.json")
  process.exit(1)
}

const pin = `^${version}`
let changed = false

if (testPkg.dependencies?.["@forkshop/engine"] !== pin) {
  testPkg.dependencies ??= {}
  testPkg.dependencies["@forkshop/engine"] = pin
  changed = true
}
if (testPkg.devDependencies?.forkshop !== pin) {
  testPkg.devDependencies ??= {}
  testPkg.devDependencies.forkshop = pin
  changed = true
}

if (changed) {
  writeFileSync(testPkgPath, JSON.stringify(testPkg, null, 2) + "\n", "utf8")
  console.log(`bump-test-pins: apps/test pinned to ${pin}`)
} else {
  console.log(`bump-test-pins: apps/test already at ${pin}, no change`)
}
