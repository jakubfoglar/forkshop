import path from "node:path"
import { buildManifest } from "forkshop/manifest-builder"

// During `next build` and `next dev`, cwd is apps/docs. Walk up to workspace root
// and into packages/engine.
const REGISTRY_ROOT = path.resolve(process.cwd(), "../../packages/engine")

const REGISTRY_BASE_URL =
  process.env.FORKSHOP_REGISTRY_BASE_URL ?? "https://forkshop.dev/r/"

export const dynamic = "force-static"
export const revalidate = false

export async function GET() {
  const manifest = await buildManifest({
    registryRoot: REGISTRY_ROOT,
    registryBaseUrl: REGISTRY_BASE_URL,
  })

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
