import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const STORAGE_PATH = "app/forkshop/positions.json"   // relative to cwd; users can override via env

type PositionsMap = Record<string, { x: number; y: number }>

async function readPositions(): Promise<PositionsMap> {
  const path = process.env.FORKSHOP_POSITIONS_PATH ?? STORAGE_PATH
  const absolute = resolve(process.cwd(), path)
  try {
    const raw = await readFile(absolute, "utf-8")
    return JSON.parse(raw) as PositionsMap
  } catch {
    return {}
  }
}

async function writePositions(map: PositionsMap): Promise<void> {
  const path = process.env.FORKSHOP_POSITIONS_PATH ?? STORAGE_PATH
  const absolute = resolve(process.cwd(), path)
  await mkdir(dirname(absolute), { recursive: true })
  await writeFile(absolute, JSON.stringify(map, null, 2), "utf-8")
}

export async function GET() {
  return NextResponse.json(await readPositions())
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Positions API is dev-only" }, { status: 403 })
  }
  const body = (await request.json()) as { id: string; x: number; y: number }
  const map = await readPositions()
  map[body.id] = { x: body.x, y: body.y }
  await writePositions(map)
  return NextResponse.json({ ok: true })
}
