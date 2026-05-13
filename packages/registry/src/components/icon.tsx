import type { ComponentType, SVGProps } from "react"

type IconoirComponent = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>

type FogmaIconProps = {
  icon: IconoirComponent
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean
}

export function FogmaIcon({ icon: Icon, className, ...rest }: FogmaIconProps) {
  return <Icon strokeWidth={2} className={className} aria-hidden={rest["aria-label"] ? undefined : true} {...rest} />
}
