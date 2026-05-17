import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"
import { injectDirectives } from "./inject-directives.js"
import { compileCss } from "./compile-css.js"
import { copyAssets } from "./copy-assets.js"

// Runs after every successful tsup build (one-shot and watch).
// Injects "use client" directives, compiles forkshop.css, and copies fonts
// into dist/. tsup's clean:true wipes dist/ at the start of each build, so
// these outputs must be regenerated every time.

const dist = path.join(ENGINE_ROOT, "dist")

await injectDirectives(dist)
await compileCss()
await copyAssets()
