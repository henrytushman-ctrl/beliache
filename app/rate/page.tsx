"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMapsLibrary } from "@vis.gl/react-google-maps"
import { Search, MapPin, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react"

type Bathroom = {
  id: string
  name: string
  address: string
  type: string
}

type Step = "location" | "attributes" | "notes" | "done"

const BATHROOM_TYPES = ["public", "restaurant", "cafe", "hotel", "gym", "office", "other"]

function PlacesAutocomplete({ onSelect, placeholder, className }: {
  onSelect: (place: { name: string; address: string; lat: number | null; lng: number | null }) => void
  placeholder?: string
  className?: string
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!places || !inputRef.current) return
    const autocomplete = new places.Autocomplete(inputRef.current, { fields: ["name", "formatted_address", "geometry"] })
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      const inputVal = inputRef.current?.value ?? ""
      const name = place.name || inputVal
      const address = place.formatted_address || inputVal
      onSelectRef.current({
        name,
        address,
        lat: place.geometry?.location?.lat() ?? null,
        lng: place.geometry?.location?.lng() ?? null,
      })
    })
  }, [places])

  return (
    <input
      ref={inputRef}
      placeholder={placeholder ?? "Search for a place…"}
      className={`flex h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 transition-shadow ${className ?? ""}`}
    />
  )
}

export default function RatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("location")

  const [results, setResults] = useState<Bathroom[]>([])
  const [selectedBathroom, setSelectedBathroom] = useState<Bathroom | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [newBathroom, setNewBathroom] = useState({ name: "", address: "", type: "public", lat: null as number | null, lng: null as number | null, accessible: false, changingTable: false, genderNeutral: false, requiresKey: false })
  const [searching, setSearching] = useState(false)

  async function handlePlaceSelect(place: { name: string; address: string; lat: number | null; lng: number | null }) {
    setNewBathroom((prev) => ({ ...prev, name: place.name, address: place.address, type: "public", lat: place.lat, lng: place.lng }))
    setSearching(true)
    try {
      const res = await fetch(`/api/bathrooms?q=${encodeURIComponent(place.name)}`)
      const data: Bathroom[] = await res.json()
      const match = data.find(
        (b) => b.name.toLowerCase() === place.name.toLowerCase() ||
               b.address.toLowerCase() === place.address.toLowerCase()
      )
      if (match) {
        setSelectedBathroom(match)
        setIsNew(false)
        setResults(data)
      } else {
        setSelectedBathroom(null)
        setIsNew(true)
        setResults([])
      }
    } catch {
      setSelectedBathroom(null)
      setIsNew(true)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const [ratings, setRatings] = useState({ cleanliness: 3, supplies: 3, smell: 3, privacy: 3, cost: 0, crowded: 3 })
  const [notes, setNotes] = useState("")
  const [directions, setDirections] = useState("")
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || photoUrls.length >= 5) return
    setUploadingPhoto(true)
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (res.ok) {
      const { url } = await res.json()
      setPhotoUrls((prev) => [...prev, url])
    }
    setUploadingPhoto(false)
    e.target.value = ""
  }

  function computeOverall(r: typeof ratings): number {
    const quality = (r.cleanliness + r.supplies + r.smell + r.privacy) / 4
    const crowdFactor = 1 - ((r.crowded - 1) / 4) * 0.4
    return Math.max(1, Math.min(10, Math.round(quality * 2 * crowdFactor)))
  }

  const overallScore = computeOverall(ratings)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      let bathroomId = selectedBathroom?.id

      if (isNew || !bathroomId) {
        const res = await fetch("/api/bathrooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newBathroom),
        })
        if (!res.ok) throw new Error(`Failed to add bathroom (${res.status})`)
        const data = await res.json()
        bathroomId = data.id
      }

      const reviewRes = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bathroomId, ...ratings, overall: overallScore, notes, directions, photoUrls }),
      })
      if (!reviewRes.ok) {
        const body = await reviewRes.json().catch(() => ({}))
        throw new Error(body.error || `Save failed (${reviewRes.status})`)
      }

      setStep("done")
      setTimeout(() => router.push(`/compare?id=${bathroomId}`), 2000)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function RatingInput({ label, field }: { label: string; field: keyof typeof ratings }) {
    const val = ratings[field]
    const max = 5

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          <span className="text-sm font-bold text-primary">
            {val}/{max}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setRatings((r) => ({ ...r, [field]: n }))}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all duration-150 ${
                n <= val
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Review Saved!</h2>
        <p className="text-muted-foreground">Redirecting to compare…</p>
      </div>
    )
  }

  const steps: Step[] = ["location", "attributes", "notes"]
  const stepLabels = ["Location", "Ratings", "Notes"]

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => {
          const currentIdx = steps.indexOf(step as Step)
          const isDone = i < currentIdx
          const isActive = i === currentIdx
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-warm"
                      : isDone
                      ? "bg-brand-100 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {stepLabels[i]}
                </span>
              </div>
              {i < 2 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors ${isDone ? "bg-primary/30" : "bg-border"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Location */}
      {step === "location" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold mb-1">Which bathroom?</h1>
            <p className="text-muted-foreground text-sm">Search for the location using Google Maps</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <PlacesAutocomplete
              onSelect={handlePlaceSelect}
              placeholder="Search for a place…"
              className="pl-9"
            />
          </div>

          {searching && (
            <p className="text-sm text-muted-foreground text-center">Checking database…</p>
          )}

          {/* Existing bathroom */}
          {selectedBathroom && (
            <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">Already in database</span>
              </div>
              <div className="font-semibold">{selectedBathroom.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {selectedBathroom.address}
              </div>
              <Badge variant="secondary" className="mt-2 text-xs capitalize">{selectedBathroom.type}</Badge>
            </div>
          )}

          {/* Other results */}
          {results.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Other nearby results</p>
              {results.filter((b) => b.id !== selectedBathroom?.id).map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBathroom(b); setIsNew(false) }}
                  className="w-full text-left p-3 rounded-xl border-2 border-border hover:border-primary/30 bg-card transition-all duration-150"
                >
                  <div className="font-medium">{b.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {b.address}
                  </div>
                  <Badge variant="secondary" className="mt-1 text-xs capitalize">{b.type}</Badge>
                </button>
              ))}
            </div>
          )}

          {/* New bathroom */}
          {isNew && newBathroom.name && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">New location — not in database yet</span>
                <div>
                  <div className="font-semibold">{newBathroom.name}</div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {newBathroom.address}
                  </p>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Bathroom type</Label>
                  <div className="flex flex-wrap gap-2">
                    {BATHROOM_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewBathroom((b) => ({ ...b, type: t }))}
                        className={`px-3 py-1 rounded-full text-sm capitalize transition-all duration-150 ${
                          newBathroom.type === t
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Accessibility</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "accessible",    emoji: "♿", label: "ADA Accessible" },
                      { key: "changingTable", emoji: "👶", label: "Changing Table" },
                      { key: "genderNeutral", emoji: "⚧",  label: "Gender Neutral" },
                      { key: "requiresKey",   emoji: "🔑", label: "Requires Key" },
                    ] as const).map(({ key, emoji, label }) => (
                      <button
                        key={key}
                        onClick={() => setNewBathroom((b) => ({ ...b, [key]: !b[key] }))}
                        className={`px-3 py-1 rounded-full text-sm transition-all duration-150 ${
                          newBathroom[key]
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            disabled={!selectedBathroom && (!isNew || !newBathroom.name)}
            onClick={() => setStep("attributes")}
          >
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2: Attributes */}
      {step === "attributes" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold mb-1">Rate the experience</h1>
            <p className="text-muted-foreground text-sm">
              {selectedBathroom?.name || newBathroom.name}
            </p>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-5">
              <div className="flex items-center justify-between pb-1">
                <Label className="text-sm font-medium text-muted-foreground">Overall Score (auto)</Label>
                <span className="text-2xl font-black text-primary">{overallScore}/10</span>
              </div>
              <div className="border-t border-border pt-4 space-y-5">
                <RatingInput label="Cleanliness" field="cleanliness" />
                <RatingInput label="Supplies (TP, soap, towels)" field="supplies" />
                <RatingInput label="Smell" field="smell" />
                <RatingInput label="Privacy" field="privacy" />
              </div>
              <div className="border-t border-border pt-4 space-y-5">
                {/* Cost */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cost to Access</Label>
                  <div className="flex gap-2">
                    {(["Free", "$", "$$", "$$$"] as const).map((label, i) => (
                      <button
                        key={label}
                        onClick={() => setRatings((r) => ({ ...r, cost: i }))}
                        className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all duration-150 ${
                          ratings.cost === i
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Crowded */}
                <RatingInput label="How Busy?" field="crowded" />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("location")} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setStep("notes")} className="flex-1">
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Notes */}
      {step === "notes" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold mb-1">Any notes?</h1>
            <p className="text-muted-foreground text-sm">Optional — what stood out?</p>
          </div>

          {/* Summary card */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2 shadow-warm">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-foreground truncate pr-2">{selectedBathroom?.name || newBathroom.name}</span>
              <span className="text-primary shrink-0">{overallScore}/10</span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Clean {ratings.cleanliness}/5</span>
              <span>Supplies {ratings.supplies}/5</span>
              <span>Smell {ratings.smell}/5</span>
              <span>Privacy {ratings.privacy}/5</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>How to find it</Label>
            <Textarea
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder="e.g. Go through the main lobby, past the coffee shop, door on the left…"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="The hand dryer was broken. The stall door didn't lock properly…"
              rows={3}
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Photos <span className="text-muted-foreground font-normal">(optional, up to 5)</span></Label>
            <div className="flex gap-2 flex-wrap">
              {photoUrls.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrls((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photoUrls.length < 5 && (
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${uploadingPhoto ? "opacity-50 pointer-events-none" : ""}`}>
                  <span className="text-2xl text-muted-foreground">{uploadingPhoto ? "…" : "+"}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Add photo</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoSelect} disabled={uploadingPhoto} />
                </label>
              )}
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-500 text-center">{submitError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("attributes")} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? "Saving…" : "Save Review"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
