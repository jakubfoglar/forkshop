import { NextResponse } from "next/server"
import { readFile, writeFile } from "node:fs/promises"
import { resolve, sep } from "node:path"

type EditRequest = {
  pagePath: string         // e.g. "app/about/page.tsx"
  originalText: string
  newText: string
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Edit API is dev-only" }, { status: 403 })
  }

  const body = (await request.json()) as EditRequest
  const { pagePath, originalText, newText } = body

  if (!pagePath || typeof originalText !== "string" || typeof newText !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Resolve against cwd; refuse paths that escape the project root.
  const projectRoot = process.cwd()
  const absolute = resolve(projectRoot, pagePath)
  if (!absolute.startsWith(projectRoot + sep)) {
    return NextResponse.json({ error: "Path escapes project root" }, { status: 400 })
  }

  let source: string
  try {
    source = await readFile(absolute, "utf-8")
  } catch {
    return NextResponse.json({ error: `Cannot read ${pagePath}` }, { status: 404 })
  }

  // Uniqueness check: originalText must appear exactly once.
  const first = source.indexOf(originalText)
  if (first === -1) {
    return NextResponse.json({ error: "Original text not found" }, { status: 404 })
  }
  const second = source.indexOf(originalText, first + 1)
  if (second !== -1) {
    return NextResponse.json({ error: "Original text not unique" }, { status: 409 })
  }

  const updated = source.slice(0, first) + newText + source.slice(first + originalText.length)
  await writeFile(absolute, updated, "utf-8")
  return NextResponse.json({ ok: true })
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Source API is dev-only" }, { status: 403 })
  }
  const url = new URL(request.url)
  const pagePath = url.searchParams.get("path")
  if (!pagePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 })
  }
  const projectRoot = process.cwd()
  const absolute = resolve(projectRoot, pagePath)
  if (!absolute.startsWith(projectRoot + sep)) {
    return NextResponse.json({ error: "Path escapes project root" }, { status: 400 })
  }
  try {
    const source = await readFile(absolute, "utf-8")
    return NextResponse.json({ source })
  } catch {
    return NextResponse.json({ error: `Cannot read ${pagePath}` }, { status: 404 })
  }
}
