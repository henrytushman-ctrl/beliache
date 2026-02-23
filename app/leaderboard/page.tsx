"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, Shuffle } from "lucide-react"

type LeaderboardEntry = {
  rank: number
  id: string
  name: string
  address: string
  type: string
  eloRating: number
  wins: number
  losses: number
  ties: number
  comparisons: number
  winRate: number | null
  reviewCount: number
  avgOverall: number | null
}

const TYPES = ["all", "public", "restaurant", "cafe", "hotel", "gym", "office", "other"]

const medalColors = [
  "bg-amber-400 text-amber-900",   // #1 gold
  "bg-zinc-300 text-zinc-700",     // #2 silver
  "bg-orange-700 text-orange-100", // #3 bronze
]

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState("all")

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedType !== "all") params.set("type", selectedType)
    const res = await fetch(`/api/leaderboard?${params}`)
    const data = await res.json()
    setEntries(data)
    setLoading(false)
  }, [selectedType])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>
        <Link
          href="/compare"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Compare
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Community rankings powered by Elo ratings
      </p>

      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={[
              "px-3 py-1.5 rounded-full text-sm whitespace-nowrap capitalize transition-all duration-150 font-medium",
              selectedType === t
                ? "bg-primary text-primary-foreground shadow-warm"
                : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-foreground font-semibold">No ranked bathrooms yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            <Link href="/compare" className="text-primary hover:underline font-medium">Start comparing</Link>{" "}
            to build the leaderboard.
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
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
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
                    {entry.address}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">{entry.type}</Badge>
                    {entry.comparisons > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {entry.wins}W · {entry.losses}L
                        {entry.ties > 0 ? ` · ${entry.ties}T` : ""}
                      </span>
                    )}
                    {entry.winRate !== null && (
                      <span className="text-xs text-muted-foreground">{entry.winRate}% win</span>
                    )}
                  </div>
                </div>

                {/* Right: Elo + review score */}
                <div className="shrink-0 text-right space-y-1">
                  <div className="text-lg font-black text-primary">{entry.eloRating}</div>
                  <div className="text-xs text-muted-foreground">Elo</div>
                  {entry.avgOverall !== null && (
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="h-3 w-3 text-primary fill-primary" />
                      <span className="text-xs font-semibold">{entry.avgOverall}/10</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer note */}
      {entries.length > 0 && (
        <p className="text-xs text-center text-muted-foreground mt-6">
          Rankings update after every comparison.{" "}
          <Link href="/compare" className="text-primary hover:underline">Vote now →</Link>
        </p>
      )}
    </div>
  )
}
