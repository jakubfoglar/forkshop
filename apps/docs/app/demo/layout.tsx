import "./globals.css"

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="demo-scope">{children}</div>
}
