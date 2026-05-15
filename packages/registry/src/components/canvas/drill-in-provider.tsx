"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import type { AnyNode } from "@forkshop/types/node"

type DrillInValue = {
  active: boolean
  node: AnyNode | null
  mark: (node: AnyNode) => void
  clear: () => void
}

const DrillInContext = createContext<DrillInValue | null>(null)

const NOOP_VALUE: DrillInValue = {
  active: false,
  node: null,
  mark: () => {},
  clear: () => {},
}

export function ForkshopDrillProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<AnyNode | null>(null)
  const mark = useCallback((n: AnyNode) => setNode(n), [])
  const clear = useCallback(() => setNode(null), [])
  const value: DrillInValue = {
    active: node !== null,
    node,
    mark,
    clear,
  }
  return <DrillInContext.Provider value={value}>{children}</DrillInContext.Provider>
}

export function useCanvasDrillIn(): DrillInValue {
  return useContext(DrillInContext) ?? NOOP_VALUE
}
