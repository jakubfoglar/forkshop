import type { ComponentType, SVGProps } from "react"

// Compatible with Lucide icons (and any icon library that follows the same shape).
export type ForkshopIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { strokeWidth?: number | string; size?: number | string }
>

type ForkshopIconProps = {
  icon: ForkshopIconComponent
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean
}

export function ForkshopIcon({ icon: Icon, className, ...rest }: ForkshopIconProps) {
  return <Icon strokeWidth={2} className={className} aria-hidden={rest["aria-label"] ? undefined : true} {...rest} />
}
