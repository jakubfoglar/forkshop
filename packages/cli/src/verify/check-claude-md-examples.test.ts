import { describe, it, expect } from "vitest"
import { extractTsCodeBlocks } from "./check-claude-md-examples.js"

describe("extractTsCodeBlocks", () => {
  it("extracts ts and tsx fenced blocks", () => {
    const md = "Some text\n```ts\nconst x = 1\n```\nMore\n```tsx\n<X />\n```"
    const blocks = extractTsCodeBlocks(md)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.lang).toBe("ts")
    expect(blocks[1]?.lang).toBe("tsx")
  })
  it("ignores bash and json blocks", () => {
    const md = "```bash\nls\n```\n```json\n{}\n```"
    expect(extractTsCodeBlocks(md)).toEqual([])
  })
})
