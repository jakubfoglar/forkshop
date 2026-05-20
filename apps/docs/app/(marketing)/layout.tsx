import localFont from "next/font/local"
import Script from "next/script"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const raveo = localFont({
  src: "../../../../packages/engine/fonts/raveo/RaveoVF.woff2",
  variable: "--font-raveo",
  display: "swap",
})

export const metadata = {
  title: "Forkshop — An infinite canvas for your Next.js project",
  description:
    "Mount a sidebar and canvas in your Next.js app. See pages at multiple viewports, edit text in iframes, and watch AI agents work — all in your dev environment.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID
  return (
    <html lang="en" className={raveo.variable}>
      <body className="font-raveo antialiased flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        {umamiWebsiteId && (
          <Script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={umamiWebsiteId}
          />
        )}
      </body>
    </html>
  )
}
