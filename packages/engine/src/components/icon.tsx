import type { ComponentType, SVGProps } from "react"

// Compatible with Central icons (and any icon library that accepts standard SVG props).
export type ForkshopIconComponent = ComponentType<SVGProps<SVGSVGElement>>

type ForkshopIconProps = {
  icon: ForkshopIconComponent
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean
}

export function ForkshopIcon({ icon: Icon, className, ...rest }: ForkshopIconProps) {
  return <Icon className={className} aria-hidden={rest["aria-label"] ? undefined : true} {...rest} />
}
