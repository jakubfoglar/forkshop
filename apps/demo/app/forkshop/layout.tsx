// Pass-through. The full-viewport chrome (fixed inset-0, data-forkshop-mount)
// lives on app/forkshop/page.tsx so the block preview subroute can render
// without it — block iframes need the page to flow naturally so body
// scrollHeight reflects real content height.
export default function ForkshopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
