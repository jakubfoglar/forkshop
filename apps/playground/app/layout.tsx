import { LocatorInit } from "@forkshop/engine"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-forkshop-sans bg-forkshop-surface text-forkshop-fg">
        <LocatorInit mountPath="/forkshop" />
        {children}
      </body>
    </html>
  )
}
