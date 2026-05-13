import type { ComponentType, SVGProps } from "react"

// Compatible with Lucide icons (and any icon library that follows the same shape).
export type FogmaIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { strokeWidth?: number | string; size?: number | string }
>

type FogmaIconProps = {
  icon: FogmaIconComponent
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean
}

export function FogmaIcon({ icon: Icon, className, ...rest }: FogmaIconProps) {
  return <Icon strokeWidth={2} className={className} aria-hidden={rest["aria-label"] ? undefined : true} {...rest} />
}
