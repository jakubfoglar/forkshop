import localFont from "next/font/local"
import "./globals.css"

const raveo = localFont({
  src: [
    {
      path: "../../../packages/registry/fonts/raveo/RaveoVF.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-raveo",
  fallback: ["Inter", "system-ui", "sans-serif"],
  display: "swap",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raveo.variable}>
      <body className="font-forkshop-sans bg-forkshop-surface text-forkshop-fg">{children}</body>
    </html>
  )
}
