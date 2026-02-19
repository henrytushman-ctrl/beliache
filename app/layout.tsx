import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/session-provider"
import { auth } from "@/auth"
import { Navbar } from "@/components/navbar"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BeliAche — Bathroom Rankings",
  description: "Rate and rank public bathrooms with your friends",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <SessionProvider session={session}>
          {session && <Navbar />}
          <main className={session ? "pt-16" : ""}>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
