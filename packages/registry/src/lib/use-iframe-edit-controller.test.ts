import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { buildEditableSet, postEdit } from "@forkshop/lib/use-iframe-edit-controller"

describe("buildEditableSet", () => {
  it("returns a Set of trimmed string literals from TSX source", () => {
    const set = buildEditableSet(`<Hero headline="Welcome to Acme" />`)
    expect(set.has("Welcome to Acme")).toBe(true)
  })

  it("returns an empty Set for an empty source", () => {
    expect(buildEditableSet("").size).toBe(0)
  })
})

describe("postEdit", () => {
  let originalFetch: typeof globalThis.fetch
  beforeEach(() => { originalFetch = globalThis.fetch })
  afterEach(() => { globalThis.fetch = originalFetch })

  it("returns { ok: true } on a 2xx response", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    ) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "Hello",
      newText: "World",
    })
    expect(result.ok).toBe(true)
  })

  it("returns { ok: false, error } when API returns 404 with an error body", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Original text not found" }), { status: 404 })
    ) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "Hello",
      newText: "World",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/not found/i)
  })

  it("returns { ok: false, error } when API returns 409 (duplicate)", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Original text not unique" }), { status: 409 })
    ) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "Submit",
      newText: "Go",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/unique/i)
  })

  it("returns { ok: false, error } when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("network down") }) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "x",
      newText: "y",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/network/i)
  })
})
