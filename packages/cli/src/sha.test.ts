import { describe, expect, it } from "vitest"
import { sha256Hex } from "./sha.js"

describe("sha256Hex", () => {
  it("produces a 64-char hex string", () => {
    const hash = sha256Hex("hello world")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic for the same input", () => {
    expect(sha256Hex("foo")).toBe(sha256Hex("foo"))
  })

  it("differs for different inputs", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"))
  })

  it("matches a known SHA-256", () => {
    expect(sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    )
  })
})
