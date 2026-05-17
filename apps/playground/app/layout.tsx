import { EditorLink } from "@forkshop/engine"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-forkshop-sans bg-forkshop-surface text-forkshop-fg">
        <EditorLink mountPath="/forkshop" />
        {children}
      </body>
    </html>
  )
}
