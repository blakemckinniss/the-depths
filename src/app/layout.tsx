import type React from "react"
import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/core/providers"

const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Depths of Shadowmire | Text Dungeon Crawler",
  description: "A text-based browser RPG dungeon crawler inspired by MUD games",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
