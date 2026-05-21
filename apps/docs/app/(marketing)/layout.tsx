import type { Metadata, Viewport } from "next"
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

const siteUrl = "https://forkshop.dev"
const siteTitle = "Forkshop — A local canvas with your real code"
const siteDescription =
  "Forkshop mounts a canvas inside your app's dev environment. Open any page at multiple viewports side-by-side, edit text in place to save back to source, and watch your AI agents work in real time."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s — Forkshop",
  },
  description: siteDescription,
  applicationName: "Forkshop",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Forkshop",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Forkshop — a local canvas with your real code.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@forkshop_dev",
    creator: "@forkshop_dev",
    title: siteTitle,
    description: siteDescription,
  },
}

export const viewport: Viewport = {
  themeColor: "#FFD711",
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID
  return (
    <div className={`${raveo.variable} font-raveo antialiased flex min-h-screen flex-col`}>
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
    </div>
  )
}
