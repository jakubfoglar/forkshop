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
  background: rgba(59, 130, 246, 0.06) !important;
}
[data-edit-mirror] {
  outline: calc(1px / var(--canvas-zoom, 1)) dashed #94a3b8 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
}
`

// CSS for the Live-AI agent decorations. Injected alongside PREVIEW_EDIT_CSS;
// must NOT inherit the global animation-disable rule above (we re-enable
// animations for the pulse + text flash). --fogma-agent-color is set on
// documentElement by the host so it scales with zoom-invariant calculations.
export const PREVIEW_AGENT_CSS = `
:root {
  --fogma-agent-color: oklch(0.62 0.22 280);
}
/* Block markers from withBlockMarker use display:contents — they have no box,
   so outline/background applied directly is invisible. Target the first
   concrete child of each marker (the block's rendered root element). */
[data-fogma-block][data-fogma-agent-active] > * {
  outline: calc(2px / var(--canvas-zoom, 1)) solid var(--fogma-agent-color) !important;
  outline-offset: calc(4px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
/* Softer, slower pulse on every block when the entire page is being edited
   (Claude touched the page's TSX, which composes blocks via props). Gives
   "this page is being worked on" without claiming a specific block changed. */
[data-fogma-agent-page-active] [data-fogma-block] > * {
  animation: fogma-agent-page-block-pulse 2.4s ease-in-out infinite !important;
  animation-duration: 2.4s !important;
}
@keyframes fogma-agent-page-block-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 calc(2px / var(--canvas-zoom, 1)) color-mix(in oklch, var(--fogma-agent-color) 30%, transparent); }
}
[data-fogma-agent-text-pulse] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid var(--fogma-agent-color) !important;
  outline-offset: calc(3px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
`

// CSS for compose mode — slot outlines, drag handles + remove buttons,
// drop-zone "+" buttons. Injected when the user toggles compose mode.
export const PREVIEW_COMPOSE_CSS = `
[data-fogma-slot] {
  position: relative;
}
[data-fogma-slot]:hover {
  outline: calc(1.5px / var(--canvas-zoom, 1)) dashed #818cf8 !important;
  outline-offset: calc(2px / var(--canvas-zoom, 1));
}
[data-fogma-compose-chrome] {
  position: absolute;
  top: calc(6px / var(--canvas-zoom, 1));
  right: calc(6px / var(--canvas-zoom, 1));
  display: flex;
  gap: calc(4px / var(--canvas-zoom, 1));
  z-index: 99999;
  pointer-events: auto;
}
[data-fogma-compose-button] {
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
[data-fogma-compose-button="handle"] { cursor: grab; color: #4f46e5; }
[data-fogma-compose-button="remove"] { color: #dc2626; border-color: #fca5a5; }
[data-fogma-compose-button]:hover { background: #f8fafc; }
[data-fogma-drop-zone] {
  height: calc(28px / var(--canvas-zoom, 1));
  margin: calc(6px / var(--canvas-zoom, 1)) 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  position: relative;
}
[data-fogma-drop-zone]::before {
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
[data-fogma-drop-zone]:hover::before {
  opacity: 1;
}
[data-fogma-drop-indicator] {
  position: absolute;
  height: calc(4px / var(--canvas-zoom, 1));
  background: #4f46e5;
  border-radius: calc(2px / var(--canvas-zoom, 1));
  pointer-events: none;
  z-index: 99999;
  box-shadow: 0 0 calc(8px / var(--canvas-zoom, 1)) rgba(79, 70, 229, 0.5);
}
[data-fogma-slot][data-fogma-dragging] {
  cursor: grabbing;
}
`
