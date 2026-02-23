"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, Trophy } from "lucide-react"

type BathroomCard = {
  id: string
  name: string
  address: string
  type: string
  eloRating: number
  comparisons: number
  wins: number
  losses: number
  reviewCount: number
  avgOverall: number | null
  avgCleanliness: number | null
  avgSmell: number | null
  avgSupplies: number | null
  avgPrivacy: number | null
}

type Pair = { a: BathroomCard; b: BathroomCard }

type VoteState =
  | { status: "idle" }
  | { status: "voting"; choice: "a" | "b" | "tie" }
  | { status: "result"; choice: "a" | "b" | "tie"; deltaA: number; deltaB: number }

// ─── Single comparison card ──────────────────────────────────────────────────

function ComparisonCard({
  bathroom,
  side,
  voteState,
  onVote,
}: {
  bathroom: BathroomCard
  side: "a" | "b"
  voteState: VoteState
  onVote: (choice: "a" | "b") => void
}) {
  const isIdle = voteState.status === "idle"
  const isChosen =
    (voteState.status === "voting" || voteState.status === "result") &&
    voteState.choice === side
  const isRejected =
    (voteState.status === "voting" || voteState.status === "result") &&
    voteState.choice !== side &&
    voteState.choice !== "tie"
  const isTied =
    (voteState.status === "voting" || voteState.status === "result") &&
    voteState.choice === "tie"

  const delta =
    voteState.status === "result"
      ? side === "a"
        ? voteState.deltaA
        : voteState.deltaB
      : null

  return (
    <button
      onClick={() => isIdle && onVote(side)}
      disabled={!isIdle}
      className={[
        "relative flex flex-col w-full rounded-2xl border-2 p-4 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isIdle
          ? "bg-card border-border hover:border-primary hover:shadow-warm-md cursor-pointer active:scale-[0.98]"
          : isChosen
          ? "bg-primary/8 border-primary shadow-warm-md"
          : isTied
          ? "bg-card border-border opacity-80"
          : isRejected
          ? "bg-secondary border-border opacity-40"
          : "bg-card border-border",
      ].join(" ")}
    >
      {/* Chosen checkmark */}
      {isChosen && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">✓</span>
        </div>
      )}

      {/* Elo delta animation */}
      {delta !== null && (
        <div
          className={[
            "absolute top-3 right-3 text-sm font-black transition-all",
            delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-muted-foreground",
          ].join(" ")}
        >
          {delta > 0 ? `+${delta}` : delta}
        </div>
      )}

      {/* Name + address */}
      <h3 className="font-bold text-base leading-snug line-clamp-2 pr-8">{bathroom.name}</h3>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 mb-3 line-clamp-1">
        <MapPin className="h-3 w-3 shrink-0" />
        {bathroom.address}
      </p>

      {/* Type + Elo */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="text-xs capitalize">{bathroom.type}</Badge>
        <span className="text-xs text-muted-foreground">#{Math.round(bathroom.eloRating)} Elo</span>
      </div>

      {/* Overall score */}
      {bathroom.avgOverall !== null ? (
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="h-4 w-4 text-primary fill-primary" />
          <span className="font-black text-lg text-primary">{bathroom.avgOverall}</span>
          <span className="text-xs text-muted-foreground">/10</span>
          <span className="text-xs text-muted-foreground ml-1">({bathroom.reviewCount} review{bathroom.reviewCount !== 1 ? "s" : ""})</span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground mb-3">No reviews yet</div>
      )}

      {/* Sub-scores */}
      {(bathroom.avgCleanliness || bathroom.avgSmell || bathroom.avgSupplies || bathroom.avgPrivacy) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {bathroom.avgCleanliness && <span>🧹 {bathroom.avgCleanliness}/5</span>}
          {bathroom.avgSupplies && <span>🧴 {bathroom.avgSupplies}/5</span>}
          {bathroom.avgSmell && <span>🌸 {bathroom.avgSmell}/5</span>}
          {bathroom.avgPrivacy && <span>🔒 {bathroom.avgPrivacy}/5</span>}
        </div>
      )}

      {/* Win record */}
      {bathroom.comparisons > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {bathroom.wins}W · {bathroom.losses}L
          {bathroom.comparisons - bathroom.wins - bathroom.losses > 0
            ? ` · ${bathroom.comparisons - bathroom.wins - bathroom.losses}T`
            : ""}
        </div>
      )}
    </button>
  )
}

// ─── Main compare page ───────────────────────────────────────────────────────

export default function ComparePage() {
  const [pair, setPair] = useState<Pair | null>(null)
  const [loading, setLoading] = useState(true)
  const [noData, setNoData] = useState(false)
  const [voteState, setVoteState] = useState<VoteState>({ status: "idle" })
  const [sessionCount, setSessionCount] = useState(0)

  const fetchPair = useCallback(async () => {
    setLoading(true)
    setVoteState({ status: "idle" })
    const res = await fetch("/api/compare")
    if (!res.ok) {
      setNoData(true)
      setLoading(false)
      return
    }
    const data = await res.json()
    setPair(data)
    setNoData(false)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPair() }, [fetchPair])

  async function vote(choice: "a" | "b" | "tie") {
    if (!pair || voteState.status !== "idle") return

    setVoteState({ status: "voting", choice })

    const winnerId =
      choice === "a" ? pair.a.id : choice === "b" ? pair.b.id : null

    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bathroomAId: pair.a.id,
        bathroomBId: pair.b.id,
        winnerId,
      }),
    })

    const { deltaA, deltaB } = await res.json()
    setVoteState({ status: "result", choice, deltaA, deltaB })
    setSessionCount((n) => n + 1)

    // Show result for 1.5 s then load the next pair
    setTimeout(() => {
      fetchPair()
    }, 1500)
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-7 bg-secondary rounded-xl animate-pulse w-56 mb-1" />
        <div className="h-4 bg-secondary rounded animate-pulse w-40 mb-8" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-64 bg-secondary rounded-2xl animate-pulse" />
          <div className="h-64 bg-secondary rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  // ── No uncompared bathrooms ──
  if (noData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🚽</div>
        <h2 className="text-xl font-bold mb-2">Nothing to compare yet</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Each bathroom is compared once when it&apos;s first added. Rate a new bathroom to trigger a comparison.
        </p>
        <Link
          href="/rate"
          className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Rate a Bathroom
        </Link>
      </div>
    )
  }

  if (!pair) return null

  const isVoting = voteState.status !== "idle"

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Which do you prefer?</h1>
        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Tap a bathroom to vote · {sessionCount > 0 && `${sessionCount} vote${sessionCount !== 1 ? "s" : ""} this session`}
      </p>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ComparisonCard
          bathroom={pair.a}
          side="a"
          voteState={voteState}
          onVote={vote}
        />

        {/* VS divider */}
        <div className="absolute left-1/2 -translate-x-1/2 mt-20 hidden sm:flex">
          {/* handled by grid gap instead */}
        </div>

        <ComparisonCard
          bathroom={pair.b}
          side="b"
          voteState={voteState}
          onVote={vote}
        />
      </div>

      {/* VS label between cards (visual only) */}
      <div className="relative -mt-[calc(50%+0.75rem)] mb-[calc(50%+0.75rem)] pointer-events-none hidden">
        <span className="absolute left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-2 py-0.5 text-xs font-bold text-muted-foreground">
          VS
        </span>
      </div>

      {/* Tie + Skip row */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => !isVoting && vote("tie")}
          disabled={isVoting}
          className="px-4 py-1.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all disabled:opacity-40"
        >
          🤝 Tie
        </button>
        <button
          onClick={() => !isVoting && fetchPair()}
          disabled={isVoting}
          className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          Skip →
        </button>
      </div>

      {/* Progress nudge */}
      {sessionCount >= 5 && sessionCount % 5 === 0 && voteState.status === "idle" && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          🎯 {sessionCount} votes in — rankings are getting sharper!
        </p>
      )}
    </div>
  )
}
