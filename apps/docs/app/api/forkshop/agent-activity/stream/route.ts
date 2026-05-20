import { NextResponse } from "next/server"

// /demo uses URL-seeded agent activity (via ?agents= param) for marketing
// showcase purposes. The engine's SSE handler would overwrite our seed every
// time it emits (which happens periodically even with no active agent). So we
// short-circuit the stream here.
//
// To re-enable live agent activity on /demo, restore the re-export from the
// engine: `export { GET } from "@forkshop/engine/api/agent-activity/stream/route"`
export async function GET() {
  return new NextResponse(null, { status: 404 })
}
