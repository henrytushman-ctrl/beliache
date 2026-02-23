"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { Search, Star, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/discover", icon: Search, label: "Discover" },
  { href: "/rate", icon: Plus, label: "Rate" },
  { href: "/rankings", icon: Star, label: "Rankings" },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/discover" className="font-bold text-xl text-emerald-600 tracking-tight">
          BeliAche 🚽
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}

          <div className="ml-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/discover" />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  )
}
