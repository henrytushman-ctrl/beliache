"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { MapPin } from "lucide-react"

type StatsData = {
  totalVisited: number
  mostPopularRecently: { id: string; name: string; address: string; reviewCount: number }[]
  worstRecently: { id: string; name: string; address: string; avgScore: number | null }[]
  topBeliAchers: { id: string; name: string | null; username: string; bathroomsVisited: number; isYou: boolean }[]
}

type BadgeType = { id: string; name: string; emoji: string; description: string }

function visitedTagline(n: number) {
  if (n === 0) return "Zero. You've rated zero bathrooms. Bold choice."
  if (n === 1) return "One down. Infinite porcelain left to conquer."
  if (n < 5)  return "A promising start. The toilets of the world await."
  if (n < 10) return "A seasoned sitter. You know your way around a stall."
  if (n < 25) return "At this point you're basically a bathroom journalist."
  if (n < 50) return "Serial bathroom enthusiast. We're not judging (we are)."
  return "You've dedicated a truly alarming amount of time to this."
}

export default function StatsPage() {
  const { user: clerkUser } = useUser()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!clerkUser?.username) return
    fetch(`/api/users/${clerkUser.username}`)
      .then((r) => r.json())
      .then((data) => setBadges(data.badges ?? []))
      .catch(() => {})
  }, [clerkUser?.username])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-secondary rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Stats</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your porcelain throne achievements</p>
      </div>

      {/* How many bathrooms have you been in */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-warm">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          🚽 How many bathrooms have you been in
        </p>
        <p className="text-6xl font-black text-primary leading-none">{stats.totalVisited}</p>
        <p className="text-xs text-muted-foreground mt-2">{visitedTagline(stats.totalVisited)}</p>
      </div>

      {/* Your badges */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-warm">
        <p className="text-sm font-medium text-muted-foreground mb-3">🎖️ Your Badges</p>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No badges yet. Review a bathroom to earn your first one.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b.id}
                title={b.description}
                className="group relative flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none hover:bg-accent transition-colors"
              >
                <span>{b.emoji}</span>
                <span>{b.name}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-foreground text-background text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                    {b.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {badges.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            {badges.length === 1
              ? "Just getting started. Many more await."
              : badges.length < 5
              ? "Getting into it. Keep exploring."
              : "A true connoisseur of public facilities."}
          </p>
        )}
      </div>

      {/* Most popular lately */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-warm">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          🔥 Most popular bathrooms lately
        </p>
        {stats.mostPopularRecently.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Nobody's been anywhere in 30 days. Everyone's just holding it in.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.mostPopularRecently.map((b, i) => (
              <Link
                key={b.id}
                href={`/bathroom/${b.id}`}
                className="flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {i + 1}. {b.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {b.address}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary ml-3 shrink-0 bg-primary/10 px-2 py-0.5 rounded-full">
                  {b.reviewCount} {b.reviewCount === 1 ? "visit" : "visits"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Worst bathroom lately */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-warm">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          💩 Worst bathroom lately
        </p>
        {stats.worstRecently.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No recent disasters on record. A miracle, or nobody's been honest.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.worstRecently.map((b, i) => (
              <Link
                key={b.id}
                href={`/bathroom/${b.id}`}
                className="flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {i + 1}. {b.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {b.address}
                  </p>
                </div>
                {b.avgScore !== null && (
                  <span className="text-xs font-bold text-red-500 ml-3 shrink-0 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                    {b.avgScore}/10
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4 italic">
          Pray you never end up here.
        </p>
      </div>

      {/* Top BeliAchers */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-warm">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          🏆 Top BeliAchers
        </p>
        <p className="text-xs text-muted-foreground mb-4 italic">
          People who have been in the most bathrooms. A title nobody asked for.
        </p>
        {stats.topBeliAchers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No one has reviewed anything yet. You could be first. No pressure.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.topBeliAchers.map((u, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`
              return (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0 w-6 text-center">{medal}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {u.name || u.username}
                        {u.isYou && (
                          <span className="ml-1.5 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            you
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground ml-3 shrink-0">
                    {u.bathroomsVisited} 🚽
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
