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
  addedBy: { name: string; username: string }
}

const COST_LABELS = ["Free", "$", "$$", "$$$"]

function ScoreBar({ label, value, emoji }: { label: string; value: number | null; emoji: string }) {
  const pct = value ? (value / 5) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 flex items-center gap-1">{emoji} {label}</span>
        <span className="font-semibold">{value ?? "—"}{value ? "/5" : ""}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all"
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
        <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!bathroom) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Bathroom not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{bathroom.name}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {bathroom.address}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="capitalize">{bathroom.type}</Badge>
            <span className="text-xs text-gray-400">Added by @{bathroom.addedBy.username}</span>
          </div>
        </div>
        <Link href="/rate">
          <Button size="sm" className="shrink-0">Rate</Button>
        </Link>
      </div>

      {/* Aggregate scores */}
      {bathroom.avgOverall !== null && (
        <Card>
          <CardContent className="pt-4">
            {/* Cost pills */}
            {bathroom.modeCost !== null && (
              <div className="flex gap-2 mb-4">
                {COST_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bathroom.modeCost === i
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl font-black text-emerald-600">{bathroom.avgOverall}</div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.round(bathroom.avgOverall ?? 0) ? "text-emerald-500 fill-emerald-500" : "text-gray-200 fill-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{bathroom.reviews.length} review{bathroom.reviews.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="space-y-3">
              <ScoreBar label="Cleanliness" value={bathroom.avgCleanliness} emoji="🧹" />
              <ScoreBar label="Supplies" value={bathroom.avgSupplies} emoji="🧴" />
              <ScoreBar label="Smell" value={bathroom.avgSmell} emoji="🌸" />
              <ScoreBar label="Privacy" value={bathroom.avgPrivacy} emoji="🔒" />
            </div>

            {/* Crowd by time period */}
            {bathroom.crowdThresholdMet && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">👥 Crowd by Time of Day</p>
                <div className="space-y-2">
                  {(["night", "morning", "afternoon", "evening"] as const).map((period) => {
                    const data = bathroom.crowdByPeriod[period]
                    const label = period.charAt(0).toUpperCase() + period.slice(1)
                    const emoji = { night: "🌙", morning: "☀️", afternoon: "🌤️", evening: "🌆" }[period]
                    const color =
                      data.avg === null ? ""
                      : data.avg <= 2 ? "bg-emerald-400"
                      : data.avg <= 3 ? "bg-yellow-400"
                      : "bg-red-400"
                    return (
                      <div key={period} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-gray-600">{emoji} {label}</span>
                        {data.count === 0 ? (
                          <span className="text-gray-400 text-xs">No data</span>
                        ) : (
                          <>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${color}`}
                                style={{ width: `${((data.avg ?? 0) / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right">{data.avg}/5 ({data.count})</span>
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
          <div className="text-center py-8 text-gray-400">
            <p>No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bathroom.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/profile/${r.user.username}`} className="flex items-center gap-2 hover:opacity-80">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={r.user.image ?? undefined} />
                        <AvatarFallback>{r.user.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{r.user.name}</div>
                        <div className="text-xs text-gray-400">@{r.user.username}</div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                      <span className="font-bold text-emerald-600">{r.overall}/10</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    <span>🧹 {r.cleanliness}/5</span>
                    <span>🧴 {r.supplies}/5</span>
                    <span>🌸 {r.smell}/5</span>
                    <span>🔒 {r.privacy}/5</span>
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{COST_LABELS[r.cost]}</span>
                    <span>👥 {r.crowded}/5</span>
                  </div>
                  {r.notes && <p className="text-sm text-gray-600 italic">&ldquo;{r.notes}&rdquo;</p>}
                  <p className="text-xs text-gray-400 mt-2">
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
