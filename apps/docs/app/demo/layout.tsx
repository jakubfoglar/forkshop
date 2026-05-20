import "./globals.css"
import { Archivo_Black, JetBrains_Mono, Inter } from "next/font/google"

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400", // Archivo Black only ships weight 400 (the face itself is heavy)
  variable: "--font-archivo-black",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-inter",
  display: "swap",
})

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`demo-scope ${archivoBlack.variable} ${jetbrainsMono.variable} ${inter.variable}`}
    >
      {children}
    </div>
  )
}
