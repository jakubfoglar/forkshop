// /demo — Forkshop showcase wrapping the WAVECLASH content from Phase 1.
// Skips SSR entirely: the canvas, sidebar, and all engine components need a
// real browser environment, and the page has no meaningful server-rendered content.
import dynamic from "next/dynamic"

const DemoStudio = dynamic(() => import("./demo-studio"), { ssr: false })

export default function DemoPage() {
  return <DemoStudio />
}
