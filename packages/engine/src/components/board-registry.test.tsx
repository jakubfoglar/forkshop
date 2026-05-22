import { useState } from "react"
import { beforeEach, describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { defineBoard } from "@forkshop/lib/define-board"
import { defineConfig } from "@forkshop/lib/define-config"
import { BoardRegistry } from "@forkshop/components/board-registry"

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", " ")
  }
})

describe("BoardRegistry", () => {
  it("renders the sidebar entry for every registered Board", () => {
    const A = defineBoard({
      id: "a",
      label: "A",
      match: (s) => s.kind === "section" && s.sectionId === "a",
      layout: "gallery",
      useEntries: () => [],
    })
    const B = defineBoard({
      id: "b",
      label: "B",
      match: (s) => s.kind === "section" && s.sectionId === "b",
      layout: "gallery",
      useEntries: () => [],
    })

    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })

    render(
      <BoardRegistry
        config={config}
        boards={[A, B]}
        initialSelection={{ kind: "section", sectionId: "b" }}
      />,
    )

    expect(screen.getByText("A")).toBeTruthy()
    expect(screen.getByText("B")).toBeTruthy()
  })

  it("warns when multiple Boards match the same selection", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const A = defineBoard({
      id: "a",
      match: () => true,
      layout: "gallery",
      useEntries: () => [],
    })
    const B = defineBoard({
      id: "b",
      match: () => true,
      layout: "gallery",
      useEntries: () => [],
    })

    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })

    render(
      <BoardRegistry
        config={config}
        boards={[A, B]}
        initialSelection={{ kind: "section", sectionId: "x" }}
      />,
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("multiple Boards matched"),
    )
    warn.mockRestore()
  })

  it("renders EmptyBoardState when no Board matches", () => {
    const A = defineBoard({
      id: "a",
      match: (s) => s.kind === "section" && s.sectionId === "a",
      layout: "gallery",
      useEntries: () => [],
    })

    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })

    render(
      <BoardRegistry
        config={config}
        boards={[A]}
        initialSelection={{ kind: "section", sectionId: "no-match" }}
      />,
    )

    expect(screen.getByText(/No Board matched/i)).toBeTruthy()
  })
})

describe("BoardRegistry hash sync", () => {
  it("writes the active selection to window.location.hash", async () => {
    const A = defineBoard({
      id: "a",
      label: "A",
      match: (s) => s.kind === "section" && s.sectionId === "a",
      layout: "gallery",
      useEntries: () => [],
    })
    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })
    render(
      <BoardRegistry
        config={config}
        boards={[A]}
        initialSelection={{ kind: "section", sectionId: "a" }}
      />,
    )
    expect(window.location.hash).toBe("#/section/a")
  })

  it("switches between boards whose useEntries hooks differ in count", () => {
    // Regression for v0.4.4 — Rules of Hooks violation when ActiveBoard's fiber
    // was reused across boards with differing internal hook counts. Without a
    // key on ActiveBoard, going from a hook-using board to a hook-less board
    // shifts the hook indices and React throws (e.g. "Rendered fewer hooks
    // than during the previous render", surfaced in v0.4.3 as a downstream
    // TypeError from useForkshopPositions).
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const FirstBoard = defineBoard({
      id: "first",
      label: "First Board",
      match: (s) => s.kind === "section" && s.sectionId === "first",
      layout: "gallery",
      useEntries: () => {
        // Two internal hooks — mirrors useDesignTokens's footprint.
        const [, setX] = useState(0)
        const [, setY] = useState(0)
        void setX
        void setY
        return []
      },
    })
    const SecondBoard = defineBoard({
      id: "second",
      label: "Second Board",
      match: (s) => s.kind === "section" && s.sectionId === "second",
      layout: "gallery",
      useEntries: () => [],
    })
    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })

    render(
      <BoardRegistry
        config={config}
        boards={[FirstBoard, SecondBoard]}
        initialSelection={{ kind: "section", sectionId: "first" }}
      />,
    )

    fireEvent.click(screen.getByText("Second Board"))

    const hookOrderViolations = errorSpy.mock.calls.filter((args) => {
      const msg = String(args[0] ?? "")
      return (
        msg.includes("Rendered fewer hooks") ||
        msg.includes("Rendered more hooks") ||
        msg.includes("change in the order of Hooks")
      )
    })
    expect(hookOrderViolations).toHaveLength(0)
    errorSpy.mockRestore()
  })

  it("reads initial selection from window.location.hash when present", () => {
    // Seed the hash before mount; the BoardRegistry should hydrate from it.
    window.history.replaceState({}, "", "#/section/b")

    const A = defineBoard({
      id: "a", label: "A",
      match: (s) => s.kind === "section" && s.sectionId === "a",
      layout: "gallery", useEntries: () => [],
    })
    const B = defineBoard({
      id: "b", label: "B",
      match: (s) => s.kind === "section" && s.sectionId === "b",
      layout: "gallery", useEntries: () => [],
    })
    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })

    // Note: omit initialSelection — the hash should drive selection.
    render(<BoardRegistry config={config} boards={[A, B]} />)

    // Board B should be active (selection.sectionId = "b" from the hash)
    expect(window.location.hash).toBe("#/section/b")
    // Cleanup
    window.history.replaceState({}, "", "#")
  })
})
