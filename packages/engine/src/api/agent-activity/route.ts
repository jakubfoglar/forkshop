import path from "node:path"
import { NextResponse } from "next/server"
import { z } from "zod"
import { recordActivity, type AgentAction } from "@forkshop/lib/agent-activity-state"
import { getOrAssignColor } from "@forkshop/lib/agent-color-palette"
import { clearSnapshot, readAndDiff } from "@forkshop/lib/file-snapshot"

const PayloadSchema = z.object({
  agent: z.string().min(1).max(64),
  agentLabel: z.string().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(128),
  file: z.string().min(1),
  action: z.enum(["read", "edit", "create", "delete"]),
  ts: z.number().int().positive(),
})

const KNOWN_AGENT_LABELS: Record<string, string> = {
  "claude-code": "Claude",
}

export async function POST(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(null, { status: 400 })
  }
  const payload = parsed.data

  const root = process.cwd()
  const absolutePath = path.isAbsolute(payload.file)
    ? payload.file
    : path.resolve(root, payload.file)
  if (!absolutePath.startsWith(root)) {
    return new Response(null, { status: 400 })
  }
  const relative = path.relative(root, absolutePath)

  const color = getOrAssignColor(payload.agent, payload.sessionId)
  const agentLabel =
    payload.agentLabel ?? KNOWN_AGENT_LABELS[payload.agent] ?? payload.agent
  const action: AgentAction = payload.action

  let hunks: ReadonlyArray<{ oldString?: string; newString?: string }> | undefined
  if (action === "edit" || action === "create") {
    hunks = await readAndDiff(absolutePath)
  } else if (action === "delete") {
    clearSnapshot(absolutePath)
    hunks = []
  }
  // action === "read" → hunks stays undefined.

  recordActivity({
    filePath: relative,
    agent: payload.agent,
    agentLabel,
    sessionId: payload.sessionId,
    color,
    action,
    lastSeenAt: payload.ts,
    hunks,
  })

  return NextResponse.json({ ok: true })
}
