export default function ForkshopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-forkshop-surface text-forkshop-fg"
      data-forkshop-mount
    >
      {children}
    </div>
  )
}
