"use client"

import { useEffect } from "react"

// Mounts Locator.js's runtime UI (Option+Click an element to open its source
// file in the editor) — but only when this page is loaded inside forkshop's
// iframes, never on the regular site. We detect by looking at the parent
// window's path. Same-origin so the access works.
//
// The transform that adds source-loc metadata runs on every TSX/JSX file in
// dev (see turbopack.rules in next.config). This component just turns on
// the UI in the right context.
export function LocatorInit({ mountPath = "/forkshop" }: { mountPath?: string } = {}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    try {
      if (globalThis.window === globalThis.window.parent) return
      const parentPath = globalThis.window.parent.location.pathname
      if (!parentPath.startsWith(mountPath)) return
    } catch {
      // Cross-origin parent or other inaccessible state — skip silently.
      return
    }
    seedLocatorOptions()
    let cancelled = false
    void import("@locator/runtime").then((module) => {
      if (cancelled) return
      const setup = module.default
      if (typeof setup === "function") setup({ showIntro: false })
    })
    return () => {
      cancelled = true
    }
  }, [mountPath])
  return <></>
}

// Pre-seed the Locator config in localStorage so first-time users don't see
// the welcome wizard and the link opens correctly from within forkshop's iframes.
// hrefTarget=_top makes the vscode:// (or other) URL navigate the top window
// instead of the iframe — Chrome blocks external-scheme navigation from
// iframes, but _top sends it to forkshop's parent frame where the browser
// triggers the OS handler without actually navigating.
function seedLocatorOptions() {
  try {
    const key = "LOCATOR_OPTIONS"
    const existingRaw = localStorage.getItem(key)
    const existing = (existingRaw ? JSON.parse(existingRaw) : {}) as Record<string, unknown>
    const next = {
      ...existing,
      welcomeScreenDismissed: true,
      showIntro: false,
      hrefTarget: existing.hrefTarget ?? "_top",
    }
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Either localStorage unavailable or JSON malformed — skip silently and
    // let Locator handle defaults. Wizard will appear; user can dismiss.
  }
}
