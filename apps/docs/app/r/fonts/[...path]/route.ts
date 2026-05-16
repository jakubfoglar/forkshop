import { promises as fs } from "node:fs"
import path from "node:path"

const REGISTRY_FONTS_ROOT = path.resolve(process.cwd(), "../../packages/engine/fonts")

export const dynamic = "force-static"

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const segments = params.path
  const absolute = path.join(REGISTRY_FONTS_ROOT, ...segments)
  if (!absolute.startsWith(REGISTRY_FONTS_ROOT + path.sep)) {
    return new Response(null, { status: 403 })
  }
  try {
    const buffer = await fs.readFile(absolute)
    return new Response(buffer, {
      headers: {
        "Content-Type": "font/woff2",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
