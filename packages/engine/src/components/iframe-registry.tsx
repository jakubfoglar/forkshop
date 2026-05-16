"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react"

export type IframeRegistryValue = {
  // Snapshot of currently-registered iframe elements (refs whose `.current`
  // is non-null at call time). Stable for the lifetime of the registry.
  getAll: () => HTMLIFrameElement[]
  // Adds a ref to the registry; returns an unregister function. Set-backed,
  // so re-registering the same ref is a no-op and double-unregister is safe.
  register: (ref: RefObject<HTMLIFrameElement | null>) => () => void
}

// Pure factory — no React. The Provider holds one instance in a ref. Extracted
// so the register/unregister/getAll lifecycle is unit-testable without DOM.
export function createIframeRegistry(): IframeRegistryValue {
  const refs = new Set<RefObject<HTMLIFrameElement | null>>()
  return {
    register(ref) {
      refs.add(ref)
      return () => {
        refs.delete(ref)
      }
    },
    getAll() {
      const out: HTMLIFrameElement[] = []
      for (const ref of refs) {
        if (ref.current) out.push(ref.current)
      }
      return out
    },
  }
}

const IframeRegistryContext = createContext<IframeRegistryValue | undefined>(undefined)

export function IframeRegistryProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<IframeRegistryValue | null>(null)
  if (registryRef.current === null) {
    registryRef.current = createIframeRegistry()
  }
  return (
    <IframeRegistryContext.Provider value={registryRef.current}>
      {children}
    </IframeRegistryContext.Provider>
  )
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
