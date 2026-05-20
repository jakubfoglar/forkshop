import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { defineBoard } from "@forkshop/lib/define-board"
import { defineConfig } from "@forkshop/lib/define-config"
import { BoardRegistry } from "@forkshop/components/board-registry"

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
