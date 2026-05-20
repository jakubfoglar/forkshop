import "@forkshop/engine/forkshop.css"
import "./globals.css"

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-scope h-screen overflow-hidden">
      {children}
    </div>
  )
}
