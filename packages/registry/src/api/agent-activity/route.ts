import { NextResponse } from "next/server"

// No-op until the live AI awareness spec wires the in-memory store + SSE.
export async function POST() {
  return NextResponse.json({ ok: true })
}
