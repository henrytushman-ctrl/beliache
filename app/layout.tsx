import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { APIProvider } from "@vis.gl/react-google-maps"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BeliAche — Bathroom Rankings",
  description: "Rate and rank public bathrooms with your friends",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={["places"]}>
          <Navbar />
          <main className="pt-16">{children}</main>
        </APIProvider>
      </body>
    </html>
  )
}
