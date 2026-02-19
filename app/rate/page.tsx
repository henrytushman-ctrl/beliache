"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react"

type Bathroom = {
  id: string
  name: string
  address: string
  type: string
}

type Step = "location" | "attributes" | "notes" | "done"

const BATHROOM_TYPES = ["public", "restaurant", "cafe", "hotel", "gym", "office", "other"]

export default function RatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("location")

  // Step 1: location
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Bathroom[]>([])
  const [selectedBathroom, setSelectedBathroom] = useState<Bathroom | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [newBathroom, setNewBathroom] = useState({ name: "", address: "", type: "public" })
  const [searching, setSearching] = useState(false)

  // Step 2: attributes
  const [ratings, setRatings] = useState({ overall: 7, cleanliness: 3, supplies: 3, smell: 3, privacy: 3, cost: 0, crowded: 3 })

  // Step 3: notes
  const [notes, setNotes] = useState("")
  const [directions, setDirections] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function searchBathrooms() {
    if (!query.trim()) return
    setSearching(true)
    const res = await fetch(`/api/bathrooms?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data)
    setSearching(false)
  }

  async function handleSubmit() {
    setSubmitting(true)
    let bathroomId = selectedBathroom?.id

    if (isNew || !bathroomId) {
      const res = await fetch("/api/bathrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? newBathroom : { name: query, address: "Unknown" }),
      })
      const data = await res.json()
      bathroomId = data.id
    }

    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bathroomId, ...ratings, notes, directions }),
    })

    setStep("done")
    setSubmitting(false)
    setTimeout(() => router.push("/rankings"), 2000)
  }

  function RatingInput({ label, field, emoji }: { label: string; field: keyof typeof ratings; emoji: string }) {
    const val = ratings[field]
    const max = field === "overall" ? 10 : 5

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <span>{emoji}</span> {label}
          </Label>
          <span className="text-sm font-semibold text-emerald-600">
            {val}/{max}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setRatings((r) => ({ ...r, [field]: n }))}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition-all ${
                n <= val
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
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
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Review Saved!</h2>
        <p className="text-gray-500">Redirecting to your rankings…</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {(["location", "attributes", "notes"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s
                  ? "bg-emerald-500 text-white"
                  : (["attributes", "notes"] as Step[]).indexOf(step as Step) > i || (step as string) === "done"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="flex-1 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Location */}
      {step === "location" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Which bathroom?</h1>
            <p className="text-gray-500 text-sm">Search for an existing one or add a new location</p>
          </div>

          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchBathrooms()}
              placeholder="Search by name or address…"
              className="flex-1"
            />
            <Button onClick={searchBathrooms} disabled={searching} variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBathroom(b); setIsNew(false) }}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    selectedBathroom?.id === b.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="font-medium">{b.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {b.address}
                  </div>
                  <Badge variant="secondary" className="mt-1 text-xs">{b.type}</Badge>
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-400">or</span>
            </div>
          </div>

          <button
            onClick={() => setIsNew(!isNew)}
            className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
              isNew ? "border-emerald-500 bg-emerald-50" : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="font-medium text-emerald-700">+ Add new bathroom</div>
            <div className="text-sm text-gray-500">This location isn&apos;t in our database yet</div>
          </button>

          {isNew && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newBathroom.name}
                    onChange={(e) => setNewBathroom((b) => ({ ...b, name: e.target.value }))}
                    placeholder="e.g. Central Park Bathroom #3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={newBathroom.address}
                    onChange={(e) => setNewBathroom((b) => ({ ...b, address: e.target.value }))}
                    placeholder="e.g. 5th Ave & 72nd St, New York"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {BATHROOM_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewBathroom((b) => ({ ...b, type: t }))}
                        className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                          newBathroom.type === t
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {t}
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
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Rate the experience</h1>
            <p className="text-gray-500 text-sm">
              Rating: {selectedBathroom?.name || newBathroom.name}
            </p>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-5">
              <RatingInput label="Overall Score" field="overall" emoji="⭐" />
              <div className="border-t border-gray-100 pt-4 space-y-5">
                <RatingInput label="Cleanliness" field="cleanliness" emoji="🧹" />
                <RatingInput label="Supplies (TP, soap, towels)" field="supplies" emoji="🧴" />
                <RatingInput label="Smell" field="smell" emoji="🌸" />
                <RatingInput label="Privacy" field="privacy" emoji="🔒" />
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-5">
                {/* Cost */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <span>💵</span> Cost to Access
                  </Label>
                  <div className="flex gap-2">
                    {(["Free", "$", "$$", "$$$"] as const).map((label, i) => (
                      <button
                        key={label}
                        onClick={() => setRatings((r) => ({ ...r, cost: i }))}
                        className={`flex-1 h-9 rounded-md text-sm font-medium transition-all ${
                          ratings.cost === i
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Crowded */}
                <RatingInput label="How Busy?" field="crowded" emoji="👥" />
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
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Any notes?</h1>
            <p className="text-gray-500 text-sm">Optional — what stood out?</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>{selectedBathroom?.name || newBathroom.name}</span>
              <span className="text-emerald-600 font-bold">{ratings.overall}/10</span>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>🧹 {ratings.cleanliness}/5</span>
              <span>🧴 {ratings.supplies}/5</span>
              <span>🌸 {ratings.smell}/5</span>
              <span>🔒 {ratings.privacy}/5</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>How to find it 🗺️</Label>
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
