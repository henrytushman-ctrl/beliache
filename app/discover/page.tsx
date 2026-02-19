"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Star, Plus } from "lucide-react"

const COST_LABELS = ["Free", "$", "$$", "$$$"]

type BathroomResult = {
  id: string
  name: string
  address: string
  type: string
  avgOverall: number | null
  avgCleanliness: number | null
  avgCrowded: number | null
  modeCost: number | null
  reviewCount: number
}

const TYPES = ["all", "public", "restaurant", "cafe", "hotel", "gym", "office", "other"]

export default function DiscoverPage() {
  const [query, setQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [results, setResults] = useState<BathroomResult[]>([])
  const [loading, setLoading] = useState(true)

  const search = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (selectedType !== "all") params.set("type", selectedType)
    const res = await fetch(`/api/bathrooms?${params}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }, [query, selectedType])

  useEffect(() => {
    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [search])

  function ScoreDot({ score }: { score: number | null }) {
    if (!score) return <span className="text-gray-400 text-xs">No reviews</span>
    const color =
      score >= 8 ? "bg-emerald-500" : score >= 5 ? "bg-yellow-400" : "bg-red-400"
    return (
      <div className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm font-semibold">{score}/10</span>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discover</h1>
        <Link href="/rate">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Bathroom</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bathrooms…"
          className="pl-9"
        />
      </div>

      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap capitalize transition-colors ${
              selectedType === t
                ? "bg-emerald-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 font-medium">No bathrooms found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try a different search or{" "}
            <Link href="/rate" className="text-emerald-600 hover:underline">add one</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((b) => (
            <Link key={b.id} href={`/bathroom/${b.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{b.name}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">{b.type}</Badge>
                        {b.modeCost !== null && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {COST_LABELS[b.modeCost]}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {b.reviewCount} review{b.reviewCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <ScoreDot score={b.avgOverall} />
                      {b.avgCleanliness && (
                        <p className="text-xs text-gray-400 mt-1">🧹 {b.avgCleanliness}/5</p>
                      )}
                      {b.avgCrowded !== null && (
                        <p className="text-xs text-gray-400 mt-0.5">👥 {b.avgCrowded}/5</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
