"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { Search, Star, Plus, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/discover", icon: Search, label: "Discover" },
  { href: "/rate", icon: Plus, label: "Rate" },
  { href: "/compare", icon: Shuffle, label: "Compare" },
  { href: "/rankings", icon: Star, label: "Rankings" },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-warm h-14">
      <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/discover"
          className="font-bold text-lg tracking-tight text-primary hover:opacity-80 transition-opacity flex items-center gap-1.5"
        >
          <span className="text-xl" style={{ filter: "sepia(1) saturate(3) hue-rotate(-20deg) brightness(0.65)" }}>🚽</span>
          <span>BeliAche</span>
        </Link>

        {/* Nav + Auth */}
        <div className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            )
          })}

          <div className="ml-2 pl-2 border-l border-border">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors duration-150">
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
