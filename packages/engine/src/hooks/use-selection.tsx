"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { ForkshopSelection } from "@forkshop/types/selection"

type SelectionContextValue = {
  selection: ForkshopSelection
  setSelection: (next: ForkshopSelection) => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({
  initial,
  children,
}: {
  initial: ForkshopSelection
  children: ReactNode
}) {
  const [selection, setSelection] = useState<ForkshopSelection>(initial)
  const value = useMemo<SelectionContextValue>(() => ({ selection, setSelection }), [selection])
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection(): ForkshopSelection {
  const ctx = useContext(SelectionContext)
  if (!ctx) {
    throw new Error("useSelection must be used inside <SelectionProvider> (provided by <BoardRegistry>)")
  }
  return ctx.selection
}

export function useSetSelection(): (next: ForkshopSelection) => void {
  const ctx = useContext(SelectionContext)
  if (!ctx) {
    throw new Error("useSetSelection must be used inside <SelectionProvider> (provided by <BoardRegistry>)")
  }
  return useCallback((next: ForkshopSelection) => ctx.setSelection(next), [ctx])
}
