import { subscribe } from "@forkshop/lib/agent-activity-state"

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 403 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Initial snapshot + every subsequent broadcast goes as `event: activity`.
      const unsub = subscribe((entries) => {
        try {
          send("activity", { activeFiles: entries })
        } catch {
          // Controller already closed; ignore.
        }
      })

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`))
        } catch {
          // Controller closed; clearInterval below handles it.
        }
      }, 15000)

      const cleanup = () => {
        clearInterval(heartbeat)
        unsub()
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      }

      req.signal.addEventListener("abort", cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
