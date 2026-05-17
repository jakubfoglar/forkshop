import "./globals.css"
import { EditorLink } from "@forkshop/engine"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export const metadata = { title: "Playground" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 antialiased">
        <EditorLink mountPath="/forkshop" />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
