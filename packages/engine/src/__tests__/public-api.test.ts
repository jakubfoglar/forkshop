import { describe, expect, it } from "vitest"
import snapshot from "./public-api.snap.json"
import * as root from "@forkshop/engine"
import * as discoverBlocksMod from "@forkshop/engine/lib/discover-blocks"
import * as discoverPrimitivesMod from "@forkshop/engine/lib/discover-primitives"
import * as fileToSelectionMod from "@forkshop/engine/lib/file-to-selection"
import * as tokenRegistryMod from "@forkshop/engine/lib/token-registry"
import * as parseTokenMod from "@forkshop/engine/lib/parse-token-registry-from-css-vars"
import * as sitemapTreeMod from "@forkshop/engine/lib/sitemap-tree"
import * as editRouteMod from "@forkshop/engine/api/edit/route"
import * as positionsRouteMod from "@forkshop/engine/api/positions/route"
import * as agentActivityRouteMod from "@forkshop/engine/api/agent-activity/route"
import * as agentActivityStreamRouteMod from "@forkshop/engine/api/agent-activity/stream/route"
import * as tailwindPresetMod from "@forkshop/engine/tailwind-preset"

const subpathModules: Record<string, Record<string, unknown>> = {
  "@forkshop/engine": root,
  "@forkshop/engine/lib/discover-blocks": discoverBlocksMod,
  "@forkshop/engine/lib/discover-primitives": discoverPrimitivesMod,
  "@forkshop/engine/lib/file-to-selection": fileToSelectionMod,
  "@forkshop/engine/lib/token-registry": tokenRegistryMod,
  "@forkshop/engine/lib/parse-token-registry-from-css-vars": parseTokenMod,
  "@forkshop/engine/lib/sitemap-tree": sitemapTreeMod,
  "@forkshop/engine/api/edit/route": editRouteMod,
  "@forkshop/engine/api/positions/route": positionsRouteMod,
  "@forkshop/engine/api/agent-activity/route": agentActivityRouteMod,
  "@forkshop/engine/api/agent-activity/stream/route": agentActivityStreamRouteMod,
  "@forkshop/engine/tailwind-preset": tailwindPresetMod,
}

describe("public API surface", () => {
  for (const [subpath, expectedExports] of Object.entries(snapshot)) {
    it(`${subpath} matches snapshot`, () => {
      const mod = subpathModules[subpath]
      expect(mod, `${subpath} not imported in test`).toBeDefined()
      const actual = Object.keys(mod!).filter((k) => k !== "default").sort()
      expect(actual).toEqual(expectedExports)
    })
  }
})
