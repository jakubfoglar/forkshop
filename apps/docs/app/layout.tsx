import localFont from "next/font/local"
import { RootProvider } from "fumadocs-ui/provider"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"

const raveo = localFont({
  src: "../../../packages/engine/fonts/raveo/RaveoVF.woff2",
  variable: "--font-raveo",
  display: "swap",
})

export const metadata = {
  title: "Forkshop — A Figma-style canvas for your Next.js project",
  description:
    "Mount a sidebar and canvas in your Next.js app. See pages at multiple viewports, edit text in iframes, and watch AI agents work — all in your dev environment.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raveo.variable}>
      <body className="font-raveo antialiased">
        <RootProvider>
          <SiteHeader />
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
