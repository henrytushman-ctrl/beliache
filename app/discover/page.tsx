"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps"
import { Search, MapPin, Star, Plus, List, Map as MapIcon, Crosshair } from "lucide-react"

const COST_LABELS = ["Free", "$", "$$", "$$$"]

type BathroomResult = {
  id: string
  name: string
  address: string
  type: string
  lat: number | null
  lng: number | null
  avgOverall: number | null
  avgCleanliness: number | null
  avgCrowded: number | null
  modeCost: number | null
  reviewCount: number
}

const TYPES = ["all", "public", "restaurant", "cafe", "hotel", "gym", "office", "other"]

function ScoreDot({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">No reviews</span>
  const color = score >= 8 ? "bg-green-500" : score >= 5 ? "bg-orange-400" : "bg-red-500"
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm font-bold">{score}/10</span>
    </div>
  )
}

function pinConfig(score: number | null) {
  if (!score) return { bg: "#9C8070", glow: "rgba(107,79,58,0.35)" }
  if (score >= 8) return { bg: "#16a34a", glow: "rgba(22,163,74,0.45)" }
  if (score >= 5) return { bg: "#ea580c", glow: "rgba(234,88,12,0.45)" }
  return { bg: "#dc2626", glow: "rgba(220,38,38,0.45)" }
}

function ScorePin({ score, onClick }: { score: number | null; onClick: () => void }) {
  const { bg, glow } = pinConfig(score)
  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", filter: `drop-shadow(0 4px 8px ${glow}) drop-shadow(0 1px 3px rgba(0,0,0,0.5))` }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          background: bg,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          border: "3px solid white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            transform: "rotate(45deg)",
            color: "white",
            fontWeight: 900,
            fontSize: 13,
            lineHeight: 1,
            letterSpacing: "-0.5px",
          }}
        >
          {score ?? "?"}
        </span>
      </div>
    </div>
  )
}

function MapView({ results }: { results: BathroomResult[] }) {
  const map = useMap()
  const router = useRouter()
  const [selected, setSelected] = useState<BathroomResult | null>(null)
  const located = useRef(false)

  function goToMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      map?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      map?.setZoom(15)
    })
  }

  useEffect(() => {
    if (located.current || !map) return
    const withCoords = results.filter((b) => b.lat && b.lng)
    if (withCoords.length === 0) return
    if (withCoords.length === 1) {
      map.panTo({ lat: withCoords[0].lat!, lng: withCoords[0].lng! })
      map.setZoom(15)
    } else {
      const bounds = new google.maps.LatLngBounds()
      withCoords.forEach((b) => bounds.extend({ lat: b.lat!, lng: b.lng! }))
      map.fitBounds(bounds, 60)
    }
    located.current = true
  }, [map, results])

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-warm" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
      <Map
        defaultCenter={{ lat: 40.7128, lng: -74.006 }}
        defaultZoom={13}
        mapId="beliache-map"
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: "100%", height: "100%" }}
      >
        {results.filter((b) => b.lat && b.lng).map((b) => (
          <AdvancedMarker
            key={b.id}
            position={{ lat: b.lat!, lng: b.lng! }}
            onClick={() => setSelected(b)}
          >
            <ScorePin score={b.avgOverall} onClick={() => setSelected(b)} />
          </AdvancedMarker>
        ))}

        {selected && selected.lat && selected.lng && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-1 min-w-[160px]">
              <p className="font-semibold text-sm">{selected.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selected.address}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs capitalize">{selected.type}</Badge>
                {selected.modeCost !== null && (
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.42 0.072 50)" }}>
                    {COST_LABELS[selected.modeCost]}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <ScoreDot score={selected.avgOverall} />
                <button
                  onClick={() => router.push(`/bathroom/${selected.id}`)}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: "oklch(0.42 0.072 50)" }}
                >
                  View →
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>

      <button
        onClick={goToMe}
        className="absolute bottom-4 right-4 bg-card rounded-full shadow-warm-md p-2.5 hover:bg-accent transition-colors"
        title="Center on my location"
      >
        <Crosshair className="h-5 w-5 text-foreground" />
      </button>
    </div>
  )
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [results, setResults] = useState<BathroomResult[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "map">("list")

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discover</h1>
        <Link href="/rate">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Bathroom</Button>
        </Link>
      </div>

      {/* Search + view toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bathrooms…"
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden bg-card shadow-warm">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 transition-colors duration-150 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-2 transition-colors duration-150 ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap capitalize transition-all duration-150 font-medium ${
              selectedType === t
                ? "bg-primary text-primary-foreground shadow-warm"
                : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground"
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
            <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-foreground font-semibold">No bathrooms found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search or{" "}
            <Link href="/rate" className="text-primary hover:underline font-medium">add one</Link>
          </p>
        </div>
      ) : view === "map" ? (
        <MapView results={results} />
      ) : (
        <div className="space-y-3">
          {results.map((b) => (
            <Link key={b.id} href={`/bathroom/${b.id}`}>
              <Card className="hover:shadow-warm-md transition-shadow duration-200 cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{b.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs capitalize">{b.type}</Badge>
                        {b.modeCost !== null && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {COST_LABELS[b.modeCost]}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {b.reviewCount} review{b.reviewCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <ScoreDot score={b.avgOverall} />
                      {b.avgCleanliness && (
                        <p className="text-xs text-muted-foreground">🧹 {b.avgCleanliness}/5</p>
                      )}
                      {b.avgCrowded !== null && (
                        <p className="text-xs text-muted-foreground">👥 {b.avgCrowded}/5</p>
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
