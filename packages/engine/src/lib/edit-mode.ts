export const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK"])

export function isTextElement(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName)) return false
  if (element.children.length > 0) return false
  const text = element.textContent?.trim() ?? ""
  return text.length > 0
}

export function computeDomPath(element: Element): string {
  const parts: string[] = []
  let current: Element = element
  while (current.tagName !== "HTML") {
    const parent: HTMLElement | null = current.parentElement
    if (!parent) break
    const tag = current.tagName.toLowerCase()
    const tagName = current.tagName
    const sameTagSiblings = [...parent.children].filter((sibling) => sibling.tagName === tagName)
    const index = sameTagSiblings.indexOf(current)
    parts.unshift(`${tag}:nth-of-type(${index + 1})`)
    current = parent
  }
  return parts.join(" > ")
}

// Outline widths and offsets compensate for the canvas's CSS scale so the
// edit/inspect indicators read at a consistent on-screen thickness regardless
// of zoom. The host sets --canvas-zoom on documentElement and keeps it in sync.
export const PREVIEW_EDIT_CSS = `
*, *::before, *::after {
  animation-duration: 0.001ms !important;
  animation-delay: 0s !important;
  transition-duration: 0.001ms !important;
  transition-delay: 0s !important;
}
[data-edit-hover] {
  outline: calc(1.5px / var(--canvas-zoom, 1)) solid #3b82f6 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
  cursor: text !important;
}
[data-editing] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid #3b82f6 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
}
[data-edit-mirror] {
  outline: calc(1px / var(--canvas-zoom, 1)) dashed #94a3b8 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
}
[data-edit-locked] {
  outline: calc(1px / var(--canvas-zoom, 1)) dashed #94a3b8 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
  cursor: not-allowed !important;
}
`

// CSS for the Live-AI agent decorations inside iframes. The host sets
// --forkshop-agent-color inline on the decorated element (per-event color).
// This block intentionally does NOT declare --forkshop-agent-color on :root
// — colors are always per-event from agent identity.
export const PREVIEW_AGENT_CSS = `
[data-forkshop-block][data-forkshop-agent-active] > * {
  outline: calc(2px / var(--canvas-zoom, 1)) solid var(--forkshop-agent-color, oklch(0.62 0.22 280)) !important;
  outline-offset: calc(4px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
@media (prefers-reduced-motion: no-preference) {
  [data-forkshop-agent-page-active] [data-forkshop-block] > * {
    animation: forkshop-agent-page-block-pulse 2.4s ease-in-out infinite !important;
    animation-duration: 2.4s !important;
  }
  @keyframes forkshop-agent-page-block-pulse {
    0%, 100% { box-shadow: none; }
    50%      { box-shadow: 0 0 0 calc(2px / var(--canvas-zoom, 1)) color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 30%, transparent); }
  }
}
[data-forkshop-agent-text-pulse] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid var(--forkshop-agent-color, oklch(0.62 0.22 280)) !important;
  outline-offset: calc(3px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
`

// CSS for read activity. Mounted in the HOST document (not inside iframes).
// Targets the iframe-host wrapper container by data attribute.
export const PREVIEW_AGENT_READ_CSS = `
[data-forkshop-iframe-host][data-forkshop-agent-reading] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 30%, transparent) !important;
  outline-offset: calc(4px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
@media (prefers-reduced-motion: no-preference) {
  [data-forkshop-iframe-host][data-forkshop-agent-reading] {
    animation: forkshop-agent-read-breathe 2.4s ease-in-out infinite !important;
  }
  @keyframes forkshop-agent-read-breathe {
    0%, 100% { outline-color: color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 25%, transparent); }
    50%      { outline-color: color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 60%, transparent); }
  }
}
`

// CSS for compose mode — slot outlines, drag handles + remove buttons,
// drop-zone "+" buttons. Injected when the user toggles compose mode.
export const PREVIEW_COMPOSE_CSS = `
[data-forkshop-slot] {
  position: relative;
}
[data-forkshop-slot]:hover {
  outline: calc(1.5px / var(--canvas-zoom, 1)) dashed #818cf8 !important;
  outline-offset: calc(2px / var(--canvas-zoom, 1));
}
[data-forkshop-compose-chrome] {
  position: absolute;
  top: calc(6px / var(--canvas-zoom, 1));
  right: calc(6px / var(--canvas-zoom, 1));
  display: flex;
  gap: calc(4px / var(--canvas-zoom, 1));
  z-index: 99999;
  pointer-events: auto;
}
[data-forkshop-compose-button] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(24px / var(--canvas-zoom, 1));
  height: calc(24px / var(--canvas-zoom, 1));
  padding: 0 calc(6px / var(--canvas-zoom, 1));
  background: white;
  border: calc(1px / var(--canvas-zoom, 1)) solid #cbd5e1;
  border-radius: calc(4px / var(--canvas-zoom, 1));
  font-size: calc(13px / var(--canvas-zoom, 1));
  line-height: 1;
  color: #475569;
  cursor: pointer;
  user-select: none;
  font-family: inherit;
}
[data-forkshop-compose-button="handle"] { cursor: grab; color: #4f46e5; }
[data-forkshop-compose-button="remove"] { color: #dc2626; border-color: #fca5a5; }
[data-forkshop-compose-button]:hover { background: #f8fafc; }
[data-forkshop-drop-zone] {
  height: calc(28px / var(--canvas-zoom, 1));
  margin: calc(6px / var(--canvas-zoom, 1)) 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  position: relative;
}
[data-forkshop-drop-zone]::before {
  content: "+";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(24px / var(--canvas-zoom, 1));
  height: calc(24px / var(--canvas-zoom, 1));
  background: white;
  border: calc(1.5px / var(--canvas-zoom, 1)) solid #818cf8;
  border-radius: 50%;
  font-size: calc(14px / var(--canvas-zoom, 1));
  font-weight: 600;
  color: #4f46e5;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 120ms ease-out, transform 120ms ease-out, background 120ms ease-out;
}
[data-forkshop-drop-zone]:hover::before {
  opacity: 1;
}
[data-forkshop-drop-indicator] {
  position: absolute;
  height: calc(4px / var(--canvas-zoom, 1));
  background: #4f46e5;
  border-radius: calc(2px / var(--canvas-zoom, 1));
  pointer-events: none;
  z-index: 99999;
  box-shadow: 0 0 calc(8px / var(--canvas-zoom, 1)) rgba(79, 70, 229, 0.5);
}
[data-forkshop-slot][data-forkshop-dragging] {
  cursor: grabbing;
}
`
