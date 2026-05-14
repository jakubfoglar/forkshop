import { subscribe } from "@forkshop/lib/agent-activity-state"

export const dynamic = "force-dynamic"

export function GET(req: Request): Response {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 403 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Stream closed.
        }
      }

      // Initial snapshot + every subsequent broadcast goes as `event: activity`.
      const unsub = subscribe((entries) => {
        send("activity", { activeFiles: entries })
      })

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`))
        } catch {
          // Stream closed; clearInterval below handles it.
        }
      }, 15000)

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsub()
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  })
}
