"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react"

type IframeRegistryValue = {
  // Returns a snapshot of currently-registered iframe elements. Stable function.
  getAll: () => HTMLIFrameElement[]
  register: (ref: RefObject<HTMLIFrameElement | null>) => () => void
}

const IframeRegistryContext = createContext<IframeRegistryValue | undefined>(undefined)

export function IframeRegistryProvider({ children }: { children: ReactNode }) {
  const refsRef = useRef<Set<RefObject<HTMLIFrameElement | null>>>(new Set())

  const register = useCallback((ref: RefObject<HTMLIFrameElement | null>) => {
    refsRef.current.add(ref)
    return () => {
      refsRef.current.delete(ref)
    }
  }, [])

  const getAll = useCallback(() => {
    const out: HTMLIFrameElement[] = []
    for (const ref of refsRef.current) {
      if (ref.current) out.push(ref.current)
    }
    return out
  }, [])

  const value = useMemo<IframeRegistryValue>(() => ({ register, getAll }), [register, getAll])
  return <IframeRegistryContext.Provider value={value}>{children}</IframeRegistryContext.Provider>
}

export function useIframeRegistry(): IframeRegistryValue | undefined {
  return useContext(IframeRegistryContext)
}

// Kits call this with their iframe ref. Outside a provider it's a no-op (safe
// for kits used standalone without ForkshopCanvas).
export function useRegisterIframe(ref: RefObject<HTMLIFrameElement | null>): void {
  const registry = useIframeRegistry()
  useEffect(() => {
    if (!registry) return
    return registry.register(ref)
  }, [registry, ref])
}
