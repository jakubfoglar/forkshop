"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

type DrillInValue = {
  active: boolean
  mark: () => void
  clear: () => void
}

const DrillInContext = createContext<DrillInValue | null>(null)

export function ForkshopDrillProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const mark = useCallback(() => setActive(true), [])
  const clear = useCallback(() => setActive(false), [])
  return (
    <DrillInContext.Provider value={{ active, mark, clear }}>
      {children}
    </DrillInContext.Provider>
  )
}

export function useCanvasDrillIn(): DrillInValue {
  const value = useContext(DrillInContext)
  if (!value) {
    return {
      active: false,
      mark: () => {},
      clear: () => {},
    }
  }
  return value
}
