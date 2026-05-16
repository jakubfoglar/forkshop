import type { ComponentPropsWithoutRef, CSSProperties } from "react"

const INVERSE_SCALE = "scale(calc(1 / var(--canvas-zoom, 1)))"

type CanvasLabelProps = ComponentPropsWithoutRef<"div"> & {
  selected?: boolean
  hovered?: boolean
}

// The label is the transformed element itself (not a child of a wrapper).
// Browsers hit-test on the visual bounds of transformed elements, so making
// the label both the transform target and the interaction target keeps the
// hover/drag hit area aligned with what the user sees at any zoom level.
export function CanvasLabel({
  children,
  selected = false,
  hovered = false,
  style,
  ...rest
}: CanvasLabelProps) {
  const blue = selected || hovered
  const baseStyle: CSSProperties = {
    display: "inline-block",
    fontSize: 11,
    lineHeight: "14px",
    fontWeight: blue ? 600 : 400,
    color: blue ? "#1d4ed8" : "#6b7280",
    transform: INVERSE_SCALE,
    transformOrigin: "bottom left",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  }
  return (
    <div {...rest} style={{ ...baseStyle, ...style }}>
      {children}
    </div>
  )
}
