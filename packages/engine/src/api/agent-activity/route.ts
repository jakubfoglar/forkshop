import path from "node:path"
import { NextResponse } from "next/server"
import { recordActivity } from "@forkshop/lib/agent-activity-state"

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return new Response(null, { status: 400 })
  }

  const { filePath, oldString, newString } = body as {
    filePath?: unknown
    oldString?: unknown
    newString?: unknown
  }
  if (typeof filePath !== "string" || filePath.length === 0) {
    return new Response(null, { status: 400 })
  }

  const root = process.cwd()
  if (!filePath.startsWith(root)) {
    return new Response(null, { status: 400 })
  }

  const relative = path.relative(root, filePath)

  recordActivity({
    filePath: relative,
    oldString: typeof oldString === "string" ? oldString : undefined,
    newString: typeof newString === "string" ? newString : undefined,
  })

  return NextResponse.json({ ok: true })
}
