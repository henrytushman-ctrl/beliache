"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { MapPin, Share2 } from "lucide-react"

const COST_LABELS = ["Free", "$", "$$", "$$$"]

const medalColors = [
  "bg-amber-400 text-amber-900",   // #1 gold
  "bg-zinc-300 text-zinc-700",     // #2 silver
  "bg-orange-700 text-orange-100", // #3 bronze
]

type LeaderboardEntry = {
  rank: number
  id: string
  name: string
  address: string
  city: string | null
  type: string
  accessible: boolean
  changingTable: boolean
  genderNeutral: boolean
  requiresKey: boolean
  avgOverall: number | null
  modeCost: number | null
  reviewCount: number
}

function LeaderboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cityParam = searchParams.get("city") || ""

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [shared, setShared] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cityParam) params.set("city", cityParam)
    const res = await fetch(`/api/leaderboard?${params}`)
    const data = await res.json()
    setEntries(data.bathrooms ?? [])
    setCities(data.cities ?? [])
    setLoading(false)
  }, [cityParam])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  function setCity(city: string) {
    const params = new URLSearchParams()
    if (city) params.set("city", city)
    router.push(`/leaderboard?${params}`)
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: "BeliAche Leaderboard", url })
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-accent transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          {shared ? "Copied!" : "Share"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Best bathrooms, ranked by community scores
      </p>

      {/* City filters */}
      {cities.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
          <button
            onClick={() => setCity("")}
            className={[
              "px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-all duration-150",
              !cityParam
                ? "bg-primary text-primary-foreground shadow-warm"
                : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground",
            ].join(" ")}
          >
            All Cities
          </button>
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={[
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-all duration-150",
                cityParam === c
                  ? "bg-primary text-primary-foreground shadow-warm"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🚽</p>
          <p className="text-foreground font-semibold">No ranked bathrooms yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            <Link href="/rate" className="text-primary hover:underline font-medium">
              Rate a bathroom
            </Link>{" "}
            to get it on the board.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/bathroom/${entry.id}`}>
              <div className="flex items-center gap-3 bg-card rounded-2xl border border-border p-3.5 hover:shadow-warm-md hover:border-primary/20 transition-all duration-150">
                {/* Rank badge */}
                <div
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    entry.rank <= 3
                      ? medalColors[entry.rank - 1]
                      : "bg-secondary text-muted-foreground",
                  ].join(" ")}
                >
                  #{entry.rank}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {entry.city ?? entry.address}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize py-0">{entry.type}</Badge>
                    {entry.modeCost !== null && (
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full font-medium">
                        {COST_LABELS[entry.modeCost]}
                      </span>
                    )}
                    {entry.accessible    && <span className="text-xs">♿</span>}
                    {entry.changingTable && <span className="text-xs">👶</span>}
                    {entry.genderNeutral && <span className="text-xs">⚧</span>}
                    {entry.requiresKey   && <span className="text-xs">🔑</span>}
                  </div>
                </div>

                {/* Right: score */}
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black text-primary leading-none">
                    {entry.avgOverall ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">/ 10</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.reviewCount} {entry.reviewCount === 1 ? "review" : "reviews"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-xs text-center text-muted-foreground mt-6">
          Rankings update after every new review.{" "}
          <Link href="/rate" className="text-primary hover:underline">Rate a bathroom →</Link>
        </p>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
        ))}
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  )
}
