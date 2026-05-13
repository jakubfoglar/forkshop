"use client"

// Transparent button overlay for canvas tiles whose content is an iframe.
// iframes capture pointer events inside their contentDocument, so a single
// click on the page within an iframe never reaches the host React tree. This
// overlay sits absolutely on top of the iframe and intercepts clicks at the
// host level: single click = select, double click = open in isolation.
export function CanvasClickOverlay({
  label,
  onSelect,
  onIsolate,
}: {
  label: string
  onSelect: () => void
  onIsolate: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onIsolate()
      }}
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    />
  )
}
