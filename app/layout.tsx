import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { MapsProvider } from "@/components/maps-provider"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BeliAche — Bathroom Rankings",
  description: "Rate and rank public bathrooms with your friends",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geist.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
          <MapsProvider>
            <Navbar />
            <main className="pt-16">{children}</main>
          </MapsProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
