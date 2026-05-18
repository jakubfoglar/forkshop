import localFont from "next/font/local"
import "./globals.css"

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
      <body className="font-raveo antialiased">{children}</body>
    </html>
  )
}
