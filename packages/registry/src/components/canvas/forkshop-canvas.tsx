"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import type { Transform } from "@forkshop/hooks/use-draggable-node"
import type { NodeType } from "@forkshop/types/node-type"
import type { AnyNode } from "@forkshop/types/node"
import { IframeRegistryProvider } from "@forkshop/components/iframe-registry"
import { AgentIframeRelay } from "@forkshop/components/agent-iframe-relay"
import { BackButton } from "@forkshop/components/canvas/back-button"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"

export type WheelInput = {
  deltaX: number
  deltaY: number
  pinch: boolean
  screenX: number
  screenY: number
}

export type ForkshopCanvasHandle = {
  fitToView: () => void
  resetZoom: () => void
  animateToBox: (x: number, y: number, w: number, h: number) => void
  getTransform: () => Transform
  setTransform: (transform: Transform) => void
  applyWheelInput: (input: WheelInput) => void
}

export type ForkshopDrill = {
  node: AnyNode | null
  active: boolean
  mark: (node: AnyNode) => void
  clear: () => void
}

type ForkshopCanvasContextValue = {
  transformRef: RefObject<Transform>
  isInteractingRef: RefObject<boolean>
  fitToView: () => void
  resetZoom: () => void
  animateToBox: (x: number, y: number, w: number, h: number) => void
  setTransform: (transform: Transform) => void
  applyWheelInput: (input: WheelInput) => void
  containerRef: RefObject<HTMLDivElement | null>
  nodeTypes: ReadonlyArray<NodeType<AnyNode>>
  drill: ForkshopDrill
}

const ForkshopCanvasContext = createContext<ForkshopCanvasContextValue | undefined>(undefined)

export function useForkshopCanvas(): ForkshopCanvasContextValue {
  const value = useContext(ForkshopCanvasContext)
  if (!value) throw new Error("useForkshopCanvas must be used inside <ForkshopCanvas>")
  return value
}

const MIN_ZOOM = 0.02
const MAX_ZOOM = 2
const ZOOM_SENSITIVITY = 0.01
const CANVAS_PADDING = 80
const ANIMATION_DURATION_MS = 300

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function ForkshopCanvas({
  ref,
  initialTransform,
  onTransformChange,
  stageWidth,
  stageHeight,
  fitMode = "width",
  onContainerClick,
  containerRef,
  stageRef,
  nodeTypes = [],
  children,
}: {
  ref?: RefObject<ForkshopCanvasHandle | null>
  initialTransform?: Transform
  onTransformChange?: (transform: Transform) => void
  stageWidth: number
  stageHeight: number
  fitMode?: "width" | "both"
  onContainerClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  containerRef: RefObject<HTMLDivElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  nodeTypes?: ReadonlyArray<NodeType<AnyNode>>
  children: ReactNode
}) {
  const [drillNode, setDrillNode] = useState<AnyNode | null>(null)
  const drillMark = useCallback((n: AnyNode) => setDrillNode(n), [])
  const drillClear = useCallback(() => setDrillNode(null), [])

  const [transform, setTransformState] = useState<Transform>(
    initialTransform ?? { zoom: 0.5, panX: 80, panY: 80 },
  )
  const transformRef = useRef(transform)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  useEffect(() => {
    transformRef.current = transform
    onTransformChange?.(transform)
  }, [transform, onTransformChange])

  // oxlint-disable-next-line no-useless-undefined
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    },
    [],
  )

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true)
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION_MS + 20)
  }, [])

  const fitToView = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const availableW = Math.max(rect.width - CANVAS_PADDING * 2, 100)
    const availableH = Math.max(rect.height - CANVAS_PADDING * 2, 100)
    // Two fit strategies:
    // - "width": fit by width only. Use for tall responsive frames (page /
    //   block isolation) where fitting both axes scales them invisibly small.
    //   Vertical overflow is handled by scroll/pan.
    // - "both": fit both axes (use the smaller scale). Use for 2D boards
    //   (foundations / blocks / sitemap / flow) where the whole layout should
    //   be visible at once.
    const zoom =
      fitMode === "both"
        ? clamp(Math.min(availableW / stageWidth, availableH / stageHeight), MIN_ZOOM, MAX_ZOOM)
        : clamp(availableW / stageWidth, MIN_ZOOM, MAX_ZOOM)
    const scaledW = stageWidth * zoom
    const scaledH = stageHeight * zoom
    const panX = (rect.width - scaledW) / 2
    // Top-align when stage is taller than viewport; otherwise center vertically.
    const panY = scaledH > rect.height ? CANVAS_PADDING : (rect.height - scaledH) / 2
    triggerAnimation()
    setTransformState({ zoom, panX, panY })
  }, [stageWidth, stageHeight, fitMode, containerRef, triggerAnimation])

  const resetZoom = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const panX = Math.max((rect.width - stageWidth) / 2, 0)
    triggerAnimation()
    setTransformState({ zoom: 1, panX, panY: CANVAS_PADDING })
  }, [stageWidth, containerRef, triggerAnimation])

  const animateToBox = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const availableW = Math.max(rect.width - CANVAS_PADDING * 2, 100)
      const availableH = Math.max(rect.height - CANVAS_PADDING * 2, 100)
      const zoom = clamp(Math.min(availableW / width, availableH / height), MIN_ZOOM, MAX_ZOOM)
      const panX = rect.width / 2 - (x + width / 2) * zoom
      const panY = rect.height / 2 - (y + height / 2) * zoom
      triggerAnimation()
      setTransformState({ zoom, panX, panY })
    },
    [containerRef, triggerAnimation],
  )

  const setTransform = useCallback((next: Transform) => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    setIsAnimating(false)
    setTransformState(next)
  }, [])

  // oxlint-disable-next-line no-useless-undefined
  const wheelRafRef = useRef<number | undefined>(undefined)
  // oxlint-disable-next-line no-useless-undefined
  const pendingTransformRef = useRef<Transform | undefined>(undefined)
  const isInteractingRef = useRef(false)
  // oxlint-disable-next-line no-useless-undefined
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const markInteracting = useCallback(() => {
    isInteractingRef.current = true
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current)
    interactionTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false
    }, 150)
  }, [])

  const applyWheel = useCallback(
    (input: WheelInput) => {
      const container = containerRef.current
      if (!container) return
      markInteracting()
      const rect = container.getBoundingClientRect()
      const cursorX = input.screenX - rect.left
      const cursorY = input.screenY - rect.top
      const base = pendingTransformRef.current ?? transformRef.current
      const { zoom, panX, panY } = base

      let next: Transform
      if (input.pinch) {
        const worldX = (cursorX - panX) / zoom
        const worldY = (cursorY - panY) / zoom
        const newZoom = clamp(zoom * Math.exp(-input.deltaY * ZOOM_SENSITIVITY), MIN_ZOOM, MAX_ZOOM)
        const newPanX = cursorX - worldX * newZoom
        const newPanY = cursorY - worldY * newZoom
        next = { zoom: newZoom, panX: newPanX, panY: newPanY }
      } else {
        next = { zoom, panX: panX - input.deltaX, panY: panY - input.deltaY }
      }

      pendingTransformRef.current = next

      if (wheelRafRef.current === undefined) {
        wheelRafRef.current = requestAnimationFrame(() => {
          wheelRafRef.current = undefined
          const flushed = pendingTransformRef.current
          pendingTransformRef.current = undefined
          if (flushed) setTransformState(flushed)
        })
      }
    },
    [containerRef, markInteracting],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault() // always — wheel inside canvas is canvas-only
      applyWheel({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: event.clientX,
        screenY: event.clientY,
      })
    }
    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [applyWheel, containerRef])

  useEffect(() => {
    const handleDocumentWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
    }
    document.addEventListener("wheel", handleDocumentWheel, { passive: false })
    return () => document.removeEventListener("wheel", handleDocumentWheel)
  }, [])

  useEffect(() => {
    const handleGesture = (event: Event) => event.preventDefault()
    document.addEventListener("gesturestart", handleGesture, { passive: false })
    document.addEventListener("gesturechange", handleGesture, { passive: false })
    document.addEventListener("gestureend", handleGesture, { passive: false })
    return () => {
      document.removeEventListener("gesturestart", handleGesture)
      document.removeEventListener("gesturechange", handleGesture)
      document.removeEventListener("gestureend", handleGesture)
    }
  }, [])

  // Auto-fit when stage WIDTH changes (i.e. mode/isolation transitions). Height-only
  // changes — usually from iframe body-height resync — would re-fit on every load and
  // cause jitter, so we ignore them here. Users can press ⌘0 to refit at any time.
  // fitToView is read through a ref so its identity (which depends on stageHeight)
  // doesn't accidentally re-trigger this effect when only height changes.
  const fitToViewRef = useRef(fitToView)
  useEffect(() => {
    fitToViewRef.current = fitToView
  }, [fitToView])
  useEffect(() => {
    const timer = setTimeout(() => fitToViewRef.current(), 50)
    return () => clearTimeout(timer)
  }, [stageWidth])

  useEffect(
    () => () => {
      if (wheelRafRef.current !== undefined) cancelAnimationFrame(wheelRafRef.current)
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current)
    },
    [],
  )

  // Canvas keyboard shortcuts: ⌘0 fit, ⌘1 reset zoom, Space to enable pan
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null
      if (!element) return false
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") return true
      if (element.tagName === "SELECT") return true
      return element.isContentEditable
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if ((event.metaKey || event.ctrlKey) && event.key === "0") {
        event.preventDefault()
        fitToView()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "1") {
        event.preventDefault()
        resetZoom()
        return
      }
      if (event.key === " " && !event.repeat) {
        event.preventDefault()
        setIsSpaceHeld(true)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setIsSpaceHeld(false)
      }
    }

    globalThis.addEventListener("keydown", handleKeyDown)
    globalThis.addEventListener("keyup", handleKeyUp)
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown)
      globalThis.removeEventListener("keyup", handleKeyUp)
    }
  }, [fitToView, resetZoom])

  // Spacebar drag-pan
  useEffect(() => {
    if (!isSpaceHeld) return
    const container = containerRef.current
    if (!container) return

    let activePointer: number | undefined
    let startMouseX = 0
    let startMouseY = 0
    let startPanX = 0
    let startPanY = 0

    const handlePointerDown = (event: PointerEvent) => {
      if (activePointer !== undefined) return
      activePointer = event.pointerId
      startMouseX = event.clientX
      startMouseY = event.clientY
      startPanX = transformRef.current.panX
      startPanY = transformRef.current.panY
      setIsPanning(true)
      container.setPointerCapture(event.pointerId)
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (activePointer === undefined) return
      setTransformState((current) => ({
        ...current,
        panX: startPanX + (event.clientX - startMouseX),
        panY: startPanY + (event.clientY - startMouseY),
      }))
    }
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return
      activePointer = undefined
      setIsPanning(false)
      try {
        container.releasePointerCapture(event.pointerId)
      } catch {
        // already released
      }
    }

    container.addEventListener("pointerdown", handlePointerDown)
    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("pointerup", handlePointerUp)
    container.addEventListener("pointercancel", handlePointerUp)
    return () => {
      container.removeEventListener("pointerdown", handlePointerDown)
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerup", handlePointerUp)
      container.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [isSpaceHeld, containerRef])

  const handle = useMemo<ForkshopCanvasHandle>(
    () => ({
      fitToView,
      resetZoom,
      animateToBox,
      getTransform: () => transformRef.current,
      setTransform,
      applyWheelInput: applyWheel,
    }),
    [fitToView, resetZoom, animateToBox, setTransform, applyWheel],
  )
  useImperativeHandle(ref, () => handle, [handle])

  const drill = useMemo<ForkshopDrill>(
    () => ({
      node: drillNode,
      active: drillNode !== null,
      mark: drillMark,
      clear: drillClear,
    }),
    [drillNode, drillMark, drillClear],
  )

  const contextValue = useMemo<ForkshopCanvasContextValue>(
    () => ({
      transformRef,
      isInteractingRef,
      fitToView,
      resetZoom,
      animateToBox,
      setTransform,
      applyWheelInput: applyWheel,
      containerRef,
      nodeTypes,
      drill,
    }),
    [fitToView, resetZoom, animateToBox, setTransform, applyWheel, containerRef, nodeTypes, drill],
  )

  const blockStageInteraction = isSpaceHeld || isPanning

  const stageStyle: CSSProperties = useMemo(
    () =>
      ({
        transform: `translate(${Math.round(transform.panX)}px, ${Math.round(transform.panY)}px) scale(${transform.zoom})`,
        transformOrigin: "0 0",
        width: stageWidth,
        height: stageHeight || undefined,
        position: "relative",
        pointerEvents: blockStageInteraction ? "none" : "auto",
        willChange: "transform",
        transition: isAnimating ? "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
        "--canvas-zoom": String(transform.zoom),
      }) as CSSProperties,
    [transform, stageWidth, stageHeight, isAnimating, blockStageInteraction],
  )

  let containerCursor: "grabbing" | "grab" | "default" = "default"
  if (isPanning) containerCursor = "grabbing"
  else if (isSpaceHeld) containerCursor = "grab"

  return (
    <ForkshopCanvasContext.Provider value={contextValue}>
      <IframeRegistryProvider>
        <AgentIframeRelay />
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="relative flex-1 select-none overflow-hidden overscroll-contain bg-forkshop-canvas"
          style={{ cursor: containerCursor, touchAction: "none" }}
          onClick={onContainerClick}
        >
          {drillNode ? (
            <DrillSubtree node={drillNode} nodeTypes={nodeTypes} onClose={drillClear} />
          ) : (
            <div ref={stageRef as React.RefObject<HTMLDivElement>} style={stageStyle}>
              {children}
            </div>
          )}
        </div>
      </IframeRegistryProvider>
    </ForkshopCanvasContext.Provider>
  )
}

function DrillSubtree({
  node,
  nodeTypes,
  onClose,
}: {
  node: AnyNode
  nodeTypes: ReadonlyArray<NodeType<AnyNode>>
  onClose: () => void
}) {
  const nodeType = resolveNodeType(node, nodeTypes)
  if (!nodeType) return null

  const body = nodeType.drillIn ? (
    nodeType.drillIn({ node, onBack: onClose })
  ) : (
    <div className="flex h-full w-full items-center justify-center p-forkshop-8">
      <div className="bg-white shadow-md p-forkshop-8">
        {nodeType.render({ node, isSelected: false, agentActive: false })}
      </div>
    </div>
  )

  return (
    <div
      className="relative h-full w-full overflow-auto bg-forkshop-canvas"
      // Reset --canvas-zoom to 1 so descendants that compute
      // calc(1px / var(--canvas-zoom)) get correct sizing. The drill subtree
      // is rendered outside the panned stage, but inherited custom-property
      // values would otherwise leak in from any ancestor that set them.
      style={{ ["--canvas-zoom" as string]: "1" }}
    >
      <div className="absolute left-4 top-4 z-20">
        <BackButton onBack={onClose} />
      </div>
      {body}
    </div>
  )
}
