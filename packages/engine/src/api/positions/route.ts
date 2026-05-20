import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

/** Fallback path (relative to cwd) when no ?mount= param or env var is set. */
const DEFAULT_MOUNT_PATH = "app/forkshop"

type PositionsMap = Record<string, { x: number; y: number }>

/**
 * Resolves the on-disk path for positions.json.
 *
 * Priority order:
 *   1. `?mount=<path>` query param   (set by useForkshopPositions)
 *   2. FORKSHOP_POSITIONS_PATH env   (legacy override — kept for backwards compat)
 *   3. default: "app/forkshop/positions.json"
 */
function resolveStoragePath(request: Request): string {
  const url = new URL(request.url)
  const mount = url.searchParams.get("mount")
  if (mount) return `${mount}/positions.json`
  const envPath = process.env.FORKSHOP_POSITIONS_PATH
  if (envPath) return envPath
  return `${DEFAULT_MOUNT_PATH}/positions.json`
}

async function readPositions(request: Request): Promise<PositionsMap> {
  const path = resolveStoragePath(request)
  const absolute = resolve(process.cwd(), path)
  try {
    const raw = await readFile(absolute, "utf-8")
    return JSON.parse(raw) as PositionsMap
  } catch {
    return {}
  }
}

async function writePositions(request: Request, map: PositionsMap): Promise<void> {
  const path = resolveStoragePath(request)
  const absolute = resolve(process.cwd(), path)
  await mkdir(dirname(absolute), { recursive: true })
  await writeFile(absolute, JSON.stringify(map, null, 2), "utf-8")
}

export async function GET(request: Request) {
  return NextResponse.json(await readPositions(request))
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Positions API is dev-only" }, { status: 403 })
  }
  const body = (await request.json()) as { id: string; x: number; y: number }
  const map = await readPositions(request)
  map[body.id] = { x: body.x, y: body.y }
  await writePositions(request, map)
  return NextResponse.json({ ok: true })
}
