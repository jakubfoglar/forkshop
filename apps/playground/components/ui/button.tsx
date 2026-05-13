import { cn } from "@/lib/cn"

export function Button({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-fogma-accent px-4 py-2 text-sm font-medium text-fogma-accent-fg",
        className,
      )}
    >
      {children}
    </button>
  )
}
