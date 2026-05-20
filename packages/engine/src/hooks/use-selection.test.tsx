import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { ReactNode } from "react"
import { SelectionProvider, useSelection, useSetSelection } from "@forkshop/hooks/use-selection"

function wrap({ children }: { children: ReactNode }) {
  return (
    <SelectionProvider initial={{ kind: "section", sectionId: "ui-components" }}>
      {children}
    </SelectionProvider>
  )
}

describe("useSelection", () => {
  it("returns the current selection", () => {
    const { result } = renderHook(() => useSelection(), { wrapper: wrap })
    expect(result.current.kind).toBe("section")
  })

  it("updates when setSelection is called", () => {
    const { result } = renderHook(
      () => ({ sel: useSelection(), set: useSetSelection() }),
      { wrapper: wrap },
    )
    act(() => result.current.set({ kind: "page", path: "/about" }))
    expect(result.current.sel.kind).toBe("page")
  })

  it("throws when useSelection used outside provider", () => {
    expect(() => renderHook(() => useSelection())).toThrow(/SelectionProvider/)
  })
})
