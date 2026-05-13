export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-forkshop-border bg-forkshop-surface-2 px-2.5 py-0.5 text-xs text-forkshop-fg">
      {children}
    </span>
  )
}
