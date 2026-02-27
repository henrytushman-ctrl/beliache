"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { Search, Star, Plus, BarChart2, Trophy, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/discover", icon: Search, label: "Discover" },
  { href: "/rate", icon: Plus, label: "Rate" },
  { href: "/rankings", icon: Star, label: "Rankings" },
  { href: "/leaderboard", icon: Trophy, label: "Board" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/stats", icon: BarChart2, label: "Stats" },
]

export function Navbar() {
  const pathname = usePathname()
  const { isSignedIn, user } = useUser()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!isSignedIn) return
    fetch("/api/friends")
      .then((r) => r.json())
      .then((friendships: Array<{ status: string; addresseeId: string }>) => {
        const count = friendships.filter(
          (f) => f.status === "pending" && f.addresseeId === user?.id
        ).length
        setPendingCount(count)
      })
      .catch(() => {})
  }, [isSignedIn, user?.id, pathname])

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
            const isFriends = href === "/friends"
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
                {isFriends && pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}

          <div className="ml-2 pl-2 border-l border-border flex items-center gap-2">
            <Link
              href="/get-app"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150",
                pathname === "/get-app"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <span className="text-base">📲</span>
              <span className="hidden sm:block">Get App</span>
            </Link>
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
