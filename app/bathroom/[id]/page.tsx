"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Star, ArrowLeft } from "lucide-react"

type Review = {
  id: string
  overall: number
  cleanliness: number
  supplies: number
  smell: number
  privacy: number
  cost: number
  crowded: number
  notes: string | null
  directions: string | null
  visitedAt: string
  user: { id: string; name: string; username: string; image: string | null }
}

type CrowdPeriod = { avg: number | null; count: number }

type BathroomDetail = {
  id: string
  name: string
  address: string
  type: string
  reviews: Review[]
  avgOverall: number | null
  avgCleanliness: number | null
  avgSmell: number | null
  avgSupplies: number | null
  avgPrivacy: number | null
  modeCost: number | null
  crowdByPeriod: { night: CrowdPeriod; morning: CrowdPeriod; afternoon: CrowdPeriod; evening: CrowdPeriod }
  crowdThresholdMet: boolean
  directionsSummary: string | null
  addedBy: { name: string; username: string }
}

const COST_LABELS = ["Free", "$", "$$", "$$$"]

function ScoreBar({ label, value, emoji }: { label: string; value: number | null; emoji: string }) {
  const pct = value ? (value / 5) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">{emoji} {label}</span>
        <span className="font-semibold text-foreground">{value ?? "—"}{value ? "/5" : ""}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BathroomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [bathroom, setBathroom] = useState<BathroomDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBathroom = useCallback(async () => {
    const res = await fetch(`/api/bathrooms/${id}`)
    if (res.ok) setBathroom(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { fetchBathroom() }, [fetchBathroom])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-secondary rounded-xl animate-pulse w-3/4" />
        <div className="h-48 bg-secondary rounded-2xl animate-pulse" />
        <div className="h-32 bg-secondary rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!bathroom) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Bathroom not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{bathroom.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {bathroom.address}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="capitalize">{bathroom.type}</Badge>
            <span className="text-xs text-muted-foreground">Added by @{bathroom.addedBy.username}</span>
          </div>
        </div>
        <Link href="/rate">
          <Button size="sm" className="shrink-0">Rate</Button>
        </Link>
      </div>

      {/* AI Directions */}
      {bathroom.directionsSummary && (
        <Card className="border-primary/20 bg-primary/5 shadow-none">
          <CardContent className="pt-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1.5">🗺️ How to find it</p>
            <p className="text-sm text-foreground leading-relaxed">{bathroom.directionsSummary}</p>
            <p className="text-xs text-muted-foreground mt-2">AI summary from visitor directions</p>
          </CardContent>
        </Card>
      )}

      {/* Aggregate scores */}
      {bathroom.avgOverall !== null && (
        <Card>
          <CardContent className="pt-4">
            {/* Cost pills */}
            {bathroom.modeCost !== null && (
              <div className="flex gap-2 mb-5">
                {COST_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                      bathroom.modeCost === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Overall score */}
            <div className="flex items-center gap-4 mb-5">
              <div className="text-5xl font-black text-primary">{bathroom.avgOverall}</div>
              <div>
                <div className="flex items-center gap-0.5 mb-1">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.round(bathroom.avgOverall ?? 0)
                          ? "text-primary fill-primary"
                          : "text-border fill-border"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{bathroom.reviews.length} review{bathroom.reviews.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="space-y-3">
              <ScoreBar label="Cleanliness" value={bathroom.avgCleanliness} emoji="🧹" />
              <ScoreBar label="Supplies" value={bathroom.avgSupplies} emoji="🧴" />
              <ScoreBar label="Smell" value={bathroom.avgSmell} emoji="🌸" />
              <ScoreBar label="Privacy" value={bathroom.avgPrivacy} emoji="🔒" />
            </div>

            {/* Crowd by time */}
            {bathroom.crowdThresholdMet && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-sm font-semibold text-foreground mb-3">👥 Crowd by Time of Day</p>
                <div className="space-y-2.5">
                  {(["night", "morning", "afternoon", "evening"] as const).map((period) => {
                    const data = bathroom.crowdByPeriod[period]
                    const label = period.charAt(0).toUpperCase() + period.slice(1)
                    const emoji = { night: "🌙", morning: "☀️", afternoon: "🌤️", evening: "🌆" }[period]
                    const color =
                      data.avg === null ? ""
                      : data.avg <= 2 ? "bg-green-400"
                      : data.avg <= 3 ? "bg-amber-400"
                      : "bg-red-400"
                    return (
                      <div key={period} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-muted-foreground shrink-0">{emoji} {label}</span>
                        {data.count === 0 ? (
                          <span className="text-muted-foreground text-xs">No data</span>
                        ) : (
                          <>
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${color}`}
                                style={{ width: `${((data.avg ?? 0) / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{data.avg}/5 ({data.count})</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Reviews</h2>
        {bathroom.reviews.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">💬</p>
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to rate this bathroom!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bathroom.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link href={`/profile/${r.user.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.user.image ?? undefined} />
                        <AvatarFallback className="text-sm font-semibold bg-brand-100 text-primary">
                          {r.user.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{r.user.name}</div>
                        <div className="text-xs text-muted-foreground">@{r.user.username}</div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-primary fill-primary" />
                      <span className="font-bold text-primary">{r.overall}/10</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                    <span>🧹 {r.cleanliness}/5</span>
                    <span>🧴 {r.supplies}/5</span>
                    <span>🌸 {r.smell}/5</span>
                    <span>🔒 {r.privacy}/5</span>
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                      {COST_LABELS[r.cost]}
                    </span>
                    <span>👥 {r.crowded}/5</span>
                  </div>
                  {r.directions && (
                    <p className="text-sm text-foreground bg-secondary rounded-xl px-3 py-2 mt-2 leading-relaxed">
                      🗺️ <span className="font-medium">Directions:</span> {r.directions}
                    </p>
                  )}
                  {r.notes && <p className="text-sm text-muted-foreground italic mt-2 leading-relaxed">&ldquo;{r.notes}&rdquo;</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(r.visitedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
