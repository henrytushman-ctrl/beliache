"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Star, Shuffle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type RankingItem = {
  id: string
  position: number
  bathroomId: string
  bathroom: {
    id: string
    name: string
    address: string
    type: string
    eloRating: number
    wins: number
    losses: number
    ties: number
    comparisons: number
    reviews: Array<{ overall: number; cleanliness: number; smell: number; supplies: number; privacy: number }>
  }
}

const medalStyles = [
  "bg-amber-400 text-amber-900",   // #1 gold
  "bg-zinc-300 text-zinc-700",     // #2 silver
  "bg-orange-700 text-orange-100", // #3 bronze
]

// Elo-adjusted composite score: review score ± up to 2 pts based on comparison record
function compositeScore(reviewOverall: number, eloRating: number, comparisons: number): number {
  if (comparisons === 0) return reviewOverall
  const eloDelta = (eloRating - 1200) / 400  // roughly -1 to +1
  return Math.max(1, Math.min(10, reviewOverall + eloDelta * 2))
}

function RankingRow({ item, index }: { item: RankingItem; index: number }) {
  const review = item.bathroom.reviews[0]
  const composite = review
    ? compositeScore(review.overall, item.bathroom.eloRating, item.bathroom.comparisons)
    : null

  return (
    <div className="flex items-center gap-3 bg-card rounded-2xl border border-border p-3.5 shadow-warm hover:shadow-warm-md transition-all duration-150">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          index < 3 ? medalStyles[index] : "bg-secondary text-muted-foreground"
        }`}
      >
        #{index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/bathroom/${item.bathroomId}`} className="font-semibold hover:text-primary transition-colors truncate block">
          {item.bathroom.name}
        </Link>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.bathroom.address}</p>
        {review && (
          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
            <span>Clean {review.cleanliness}/5</span>
            <span>Supplies {review.supplies}/5</span>
            <span>Smell {review.smell}/5</span>
            <span>Privacy {review.privacy}/5</span>
          </div>
        )}
        {item.bathroom.comparisons > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.bathroom.wins}W · {item.bathroom.losses}L
            {item.bathroom.ties > 0 ? ` · ${item.bathroom.ties}T` : ""}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {composite !== null && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-primary fill-primary" />
            <span className="text-sm font-bold text-primary">{composite.toFixed(1)}/10</span>
          </div>
        )}
        <Badge variant="secondary" className="text-xs capitalize">{item.bathroom.type}</Badge>
      </div>
    </div>
  )
}

export default function RankingsPage() {
  const [items, setItems] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRankings = useCallback(async () => {
    const res = await fetch("/api/rankings")
    const data: RankingItem[] = await res.json()
    data.sort((a, b) => {
      const scoreA = a.bathroom.reviews[0]
        ? compositeScore(a.bathroom.reviews[0].overall, a.bathroom.eloRating, a.bathroom.comparisons)
        : -1
      const scoreB = b.bathroom.reviews[0]
        ? compositeScore(b.bathroom.reviews[0].overall, b.bathroom.eloRating, b.bathroom.comparisons)
        : -1
      return scoreB - scoreA
    })
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRankings() }, [fetchRankings])

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Rankings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ranked by score · adjusted by comparisons</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🚽</div>
          <p className="text-foreground font-semibold mb-1">No bathrooms ranked yet</p>
          <p className="text-sm text-muted-foreground mb-5">Rate a bathroom to start building your list</p>
          <Link href="/rate">
            <Button>Rate a Bathroom</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item, index) => (
              <RankingRow key={item.bathroomId} item={item} index={index} />
            ))}
          </div>

          {/* Comparison section */}
          <div className="mt-8 pt-6 border-t border-border">
            <h2 className="text-lg font-bold mb-1">Head-to-Head</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Compare bathrooms to sharpen the rankings. Winning comparisons boosts a score; losing lowers it.
            </p>
            <Link href="/compare">
              <Button className="w-full flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Compare Bathrooms
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
