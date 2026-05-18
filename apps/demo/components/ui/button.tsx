import { type ComponentPropsWithoutRef } from "react"

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "default" | "subtle"
}

export function Button({ variant = "default", className = "", ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition"
  const variants = {
    default: "bg-gray-900 text-white hover:bg-gray-800",
    subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
