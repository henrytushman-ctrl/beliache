"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  avgSmell: number | null
  avgSupplies: number | null
  avgPrivacy: number | null
  avgCrowded: number | null
  modeCost: number | null
  reviewCount: number
  accessible: boolean
  changingTable: boolean
  genderNeutral: boolean
  requiresKey: boolean
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

function pinGlow(score: number | null) {
  if (!score) return "rgba(107,79,58,0.35)"
  if (score >= 7) return "rgba(22,163,74,0.45)"
  if (score >= 4) return "rgba(234,88,12,0.45)"
  return "rgba(220,38,38,0.45)"
}

function ToiletPin({ score, displayLabel, onClick }: { score: number | null; displayLabel?: string | null; onClick: () => void }) {
  const noRating = score === null
  const isClean  = !noRating && score! >= 7   // 7–10: sparkling white
  const isMedium = !noRating && score! >= 4 && score! < 7  // 4–7: yellowed/spotted
  const isDirty  = !noRating && score! < 4    // 0–4: brown & stained

  const body  = noRating ? "#D4C5B5" : isClean ? "#FAFAFA" : isMedium ? "#EDD9A3" : "#C8956C"
  const seat  = noRating ? "#BFB0A0" : isClean ? "#E0E0E0" : isMedium ? "#D4B56A" : "#A0622A"
  const edge  = noRating ? "#9C8070" : isClean ? "#90A4AE" : isMedium ? "#8B6914" : "#5C2E00"
  const water = noRating ? "#C5B5A5" : isClean ? "#BBDEFB" : isMedium ? "#C8A84B" : "#7A4F1A"
  const label = noRating ? "#6B5040" : isClean ? "#1565C0" : isMedium ? "#5C3600" : "#FFF8F0"
  const glow  = pinGlow(score)

  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", filter: `drop-shadow(0 4px 8px ${glow}) drop-shadow(0 1px 3px rgba(0,0,0,0.4))` }}
    >
      <svg viewBox="0 0 40 54" width="40" height="54" xmlns="http://www.w3.org/2000/svg">
        {/* Tank */}
        <rect x="9" y="1" width="22" height="13" rx="3" fill={body} stroke={edge} strokeWidth="1.3" />
        {/* Flush button */}
        <rect x="24" y="5" width="5" height="2.5" rx="1.2" fill={seat} stroke={edge} strokeWidth="0.8" />
        {/* Lid connector */}
        <rect x="7" y="13" width="26" height="3.5" rx="1.5" fill={seat} stroke={edge} strokeWidth="1" />
        {/* Bowl body */}
        <path
          d="M7 16.5 C6 16.5 4 30 8 37 C11 43 14.5 46 20 46 C25.5 46 29 43 32 37 C36 30 34 16.5 33 16.5 Z"
          fill={body} stroke={edge} strokeWidth="1.3"
        />
        {/* Seat top ellipse */}
        <ellipse cx="20" cy="17" rx="13" ry="4" fill={seat} stroke={edge} strokeWidth="1.2" />
        {/* Water */}
        <ellipse cx="20" cy="37" rx="8" ry="3.5" fill={water} opacity="0.85" />

        {/* Slightly dirty: a couple faint stains */}
        {isMedium && (
          <>
            <circle cx="14" cy="26" r="1.8" fill={edge} opacity="0.35" />
            <circle cx="25.5" cy="31" r="1.2" fill={edge} opacity="0.3" />
          </>
        )}
        {/* Very dirty: heavy stains + drip */}
        {isDirty && (
          <>
            <circle cx="12.5" cy="23" r="2.5" fill={edge} opacity="0.5" />
            <circle cx="27" cy="28" r="1.8" fill={edge} opacity="0.45" />
            <circle cx="16" cy="33" r="1.5" fill={edge} opacity="0.4" />
            <path d="M29 39 Q31 44 28 47" stroke={edge} strokeWidth="1.5" fill="none" opacity="0.5" />
          </>
        )}

        {/* Score / label / "?" */}
        {(() => {
          const text = displayLabel ?? (score !== null ? String(score) : "?")
          const fs = text.length > 3 ? 8 : 10
          return (
            <text
              x="20" y="30"
              textAnchor="middle" dominantBaseline="middle"
              fill={label} fontSize={fs} fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="-0.5"
            >
              {text}
            </text>
          )
        })()}

        {/* Base */}
        <rect x="13" y="46" width="14" height="5" rx="2.5" fill={seat} stroke={edge} strokeWidth="1" />
      </svg>
    </div>
  )
}

// ─── Warm beige map style ────────────────────────────────────────────────────
// Applied via StyledMapType (not the `styles` prop) so it works alongside mapId.

const WARM_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Base — warm beige land
  { elementType: "geometry",                                        stylers: [{ color: "#F5EFE6" }] },
  { elementType: "labels.text.fill",                               stylers: [{ color: "#6F6258" }] },
  { elementType: "labels.text.stroke",                             stylers: [{ color: "#F5EFE6" }] },

  // Landscape
  { featureType: "landscape",          elementType: "geometry",    stylers: [{ color: "#F5EFE6" }] },
  { featureType: "landscape.natural",  elementType: "geometry",    stylers: [{ color: "#EDE8E0" }] },
  { featureType: "landscape.man_made", elementType: "geometry",    stylers: [{ color: "#EDE8E0" }] },

  // Water — soft blue
  { featureType: "water",              elementType: "geometry",    stylers: [{ color: "#A8C4D4" }] },
  { featureType: "water",              elementType: "labels.text.fill", stylers: [{ color: "#4A7FA5" }] },

  // Parks — desaturated tan-green
  { featureType: "poi.park",           elementType: "geometry",    stylers: [{ color: "#E4DFDA" }] },
  { featureType: "poi.park",           elementType: "labels.text.fill", stylers: [{ color: "#9E9080" }] },

  // Roads — white surface, warm gray stroke
  { featureType: "road",               elementType: "geometry",    stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road",               elementType: "geometry.stroke", stylers: [{ color: "#DDD4C8" }, { weight: 0.5 }] },
  { featureType: "road",               elementType: "labels.text.fill", stylers: [{ color: "#857A72" }] },
  { featureType: "road",               elementType: "labels.text.stroke", stylers: [{ color: "#F5EFE6" }] },
  { featureType: "road.highway",       elementType: "geometry",    stylers: [{ color: "#FFFAF5" }] },
  { featureType: "road.highway",       elementType: "geometry.stroke", stylers: [{ color: "#D0C8BC" }] },
  { featureType: "road.highway",       elementType: "labels.text.fill", stylers: [{ color: "#6F6258" }] },
  { featureType: "road.highway",       elementType: "labels.icon",     stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial",      elementType: "labels.text.fill", stylers: [{ color: "#857A72" }] },
  { featureType: "road.local",         elementType: "labels.text.fill", stylers: [{ color: "#9E9080" }] },
  { featureType: "road.local",         elementType: "labels",      stylers: [{ visibility: "simplified" }] },

  // Administrative borders — soft warm gray
  { featureType: "administrative",     elementType: "geometry.stroke", stylers: [{ color: "#DDD4C8" }] },
  { featureType: "administrative.locality",     elementType: "labels.text.fill", stylers: [{ color: "#6F6258" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#9E9080" }] },

  // POI — hide business clutter entirely
  { featureType: "poi",                elementType: "labels",      stylers: [{ visibility: "off" }] },
  { featureType: "poi.business",                                    stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex",                              stylers: [{ visibility: "off" }] },
  { featureType: "poi.school",         elementType: "geometry",    stylers: [{ color: "#EDE8E0" }] },
  { featureType: "poi.medical",        elementType: "geometry",    stylers: [{ color: "#F0EBE5" }] },

  // Transit — minimal, muted
  { featureType: "transit",            elementType: "geometry",    stylers: [{ color: "#E8E0D6" }] },
  { featureType: "transit.line",       elementType: "geometry",    stylers: [{ color: "#DDD4C8" }] },
  { featureType: "transit.station",    elementType: "labels.text.fill", stylers: [{ color: "#9E9080" }] },
  { featureType: "transit",            elementType: "labels.icon", stylers: [{ visibility: "off" }] },
]

// Returns a 0-10 value for toilet colour based on the active sort dimension
function getMapScore(b: BathroomResult, sort: SortOption): number | null {
  switch (sort) {
    case "score":       return b.avgOverall
    case "cleanliness": return b.avgCleanliness !== null ? (b.avgCleanliness / 5) * 10 : null
    case "smell":       return b.avgSmell       !== null ? (b.avgSmell       / 5) * 10 : null
    case "supplies":    return b.avgSupplies    !== null ? (b.avgSupplies    / 5) * 10 : null
    case "privacy":     return b.avgPrivacy     !== null ? (b.avgPrivacy     / 5) * 10 : null
    case "price":       return b.modeCost       !== null ? ((3 - b.modeCost) / 3) * 10 : null  // cheaper = cleaner
    case "crowd":       return b.avgCrowded     !== null ? ((5 - b.avgCrowded) / 4) * 10 : null  // less busy = cleaner
    case "reviews":     return b.avgOverall  // colour by overall, label by count
  }
}

// Returns the short text rendered inside the pin
function getMapLabel(b: BathroomResult, sort: SortOption): string | null {
  switch (sort) {
    case "score":       return b.avgOverall     !== null ? String(b.avgOverall)     : null
    case "cleanliness": return b.avgCleanliness !== null ? String(b.avgCleanliness) : null
    case "smell":       return b.avgSmell       !== null ? String(b.avgSmell)       : null
    case "supplies":    return b.avgSupplies    !== null ? String(b.avgSupplies)    : null
    case "privacy":     return b.avgPrivacy     !== null ? String(b.avgPrivacy)     : null
    case "price":       return b.modeCost       !== null ? COST_LABELS[b.modeCost]  : null
    case "crowd":       return b.avgCrowded     !== null ? String(b.avgCrowded)     : null
    case "reviews":     return String(b.reviewCount)
  }
}

function MapView({ results, sortBy, highlightId }: { results: BathroomResult[]; sortBy: SortOption; highlightId?: string | null }) {
  const map = useMap()
  const router = useRouter()
  const [selected, setSelected] = useState<BathroomResult | null>(null)
  const [pingActive, setPingActive] = useState(!!highlightId)
  const located = useRef(false)
  const styledRef = useRef(false)

  // Auto-open InfoWindow and pulse pin for 3 s when a highlight is present
  useEffect(() => {
    if (!highlightId || results.length === 0) return
    const target = results.find((b) => b.id === highlightId)
    if (target) setSelected(target)
    setPingActive(true)
    const t = setTimeout(() => setPingActive(false), 3000)
    return () => clearTimeout(t)
  }, [highlightId, results])

  // Apply warm beige theme via StyledMapType — works alongside mapId for AdvancedMarker
  useEffect(() => {
    if (!map || styledRef.current) return
    const warmType = new google.maps.StyledMapType(WARM_MAP_STYLES, { name: "BeliAche" })
    map.mapTypes.set("beliache_warm", warmType)
    map.setMapTypeId("beliache_warm")
    styledRef.current = true
  }, [map])

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
    <div className="relative rounded-2xl overflow-hidden shadow-warm warm-map" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
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
            <div className="relative">
              {pingActive && b.id === highlightId && (
                <span className="absolute -inset-3 rounded-full bg-primary/40 animate-ping pointer-events-none" />
              )}
              <ToiletPin score={getMapScore(b, sortBy)} displayLabel={getMapLabel(b, sortBy)} onClick={() => setSelected(b)} />
            </div>
          </AdvancedMarker>
        ))}

        {selected && selected.lat && selected.lng && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{ padding: "4px 2px", minWidth: 160, fontFamily: "inherit" }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: "#1F1A16", marginBottom: 2 }}>{selected.name}</p>
              <p style={{ fontSize: 11, color: "#6F6258", marginBottom: 6 }}>{selected.address}</p>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, background: "#F5EDE3", color: "#6B4F3A", padding: "2px 7px", borderRadius: 99, textTransform: "capitalize" }}>
                  {selected.type}
                </span>
                {selected.modeCost !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6B4F3A" }}>
                    {COST_LABELS[selected.modeCost]}
                  </span>
                )}
                {selected.accessible    && <span style={{ fontSize: 11 }}>♿</span>}
                {selected.changingTable && <span style={{ fontSize: 11 }}>👶</span>}
                {selected.genderNeutral && <span style={{ fontSize: 11 }}>⚧</span>}
                {selected.requiresKey   && <span style={{ fontSize: 11 }}>🔑</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <ScoreDot score={selected.avgOverall} />
                <button
                  onClick={() => router.push(`/bathroom/${selected.id}`)}
                  style={{ fontSize: 11, fontWeight: 700, color: "#6B4F3A", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
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

type SortOption = "score" | "cleanliness" | "smell" | "supplies" | "privacy" | "price" | "crowd" | "reviews"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score",       label: "Best Score" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "smell",       label: "Smell" },
  { value: "supplies",    label: "Supplies" },
  { value: "privacy",     label: "Privacy" },
  { value: "price",       label: "Cheapest" },
  { value: "crowd",       label: "Least Busy" },
  { value: "reviews",     label: "Most Reviews" },
]

function sortResults(results: BathroomResult[], by: SortOption): BathroomResult[] {
  return [...results].sort((a, b) => {
    switch (by) {
      case "score":       return (b.avgOverall ?? -1) - (a.avgOverall ?? -1)
      case "cleanliness": return (b.avgCleanliness ?? -1) - (a.avgCleanliness ?? -1)
      case "smell":       return (b.avgSmell ?? -1) - (a.avgSmell ?? -1)
      case "supplies":    return (b.avgSupplies ?? -1) - (a.avgSupplies ?? -1)
      case "privacy":     return (b.avgPrivacy ?? -1) - (a.avgPrivacy ?? -1)
      case "price":       return (a.modeCost ?? 999) - (b.modeCost ?? 999)
      case "crowd":       return (a.avgCrowded ?? 999) - (b.avgCrowded ?? 999)
      case "reviews":     return b.reviewCount - a.reviewCount
    }
  })
}

type AccessFilter = "accessible" | "changingTable" | "genderNeutral" | "requiresKey"

const ACCESS_FILTERS: { key: AccessFilter; emoji: string; label: string }[] = [
  { key: "accessible",    emoji: "♿", label: "Accessible" },
  { key: "changingTable", emoji: "👶", label: "Changing Table" },
  { key: "genderNeutral", emoji: "⚧",  label: "Gender Neutral" },
  { key: "requiresKey",   emoji: "🔑", label: "Key Required" },
]

function DiscoverContent() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")

  const [query, setQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("score")
  const [results, setResults] = useState<BathroomResult[]>([])
  const [loading, setLoading] = useState(true)
  // Default to map view when a highlight is present so they see the pin immediately
  const [view, setView] = useState<"list" | "map">(highlightId ? "map" : "list")
  const [accessFilters, setAccessFilters] = useState<Set<AccessFilter>>(new Set())

  function toggleAccess(key: AccessFilter) {
    setAccessFilters((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const search = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (selectedType !== "all") params.set("type", selectedType)
    accessFilters.forEach((f) => params.set(f, "true"))
    const res = await fetch(`/api/bathrooms?${params}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }, [query, selectedType, accessFilters])

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

      {/* Sort options */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-muted-foreground shrink-0 font-medium">Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all duration-150 font-medium ${
              sortBy === opt.value
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-card text-muted-foreground border border-border hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Accessibility filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-muted-foreground shrink-0 font-medium">Access:</span>
        {ACCESS_FILTERS.map(({ key, emoji, label }) => (
          <button
            key={key}
            onClick={() => toggleAccess(key)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all duration-150 font-medium ${
              accessFilters.has(key)
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-card text-muted-foreground border border-border hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {emoji} {label}
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
        <MapView results={results} sortBy={sortBy} highlightId={highlightId} />
      ) : (
        <div className="space-y-3">
          {sortResults(results, sortBy).map((b) => (
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
                        {b.accessible    && <span className="text-xs text-muted-foreground">♿</span>}
                        {b.changingTable && <span className="text-xs text-muted-foreground">👶</span>}
                        {b.genderNeutral && <span className="text-xs text-muted-foreground">⚧</span>}
                        {b.requiresKey   && <span className="text-xs text-muted-foreground">🔑</span>}
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

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-secondary rounded-xl animate-pulse w-40" />
        <div className="h-10 bg-secondary rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />)}
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  )
}
