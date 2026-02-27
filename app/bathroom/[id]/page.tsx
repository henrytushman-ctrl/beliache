"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Star, ArrowLeft, Pencil, ShieldCheck, Store } from "lucide-react"

type Photo = { id: string; url: string }

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
  ownerResponse: string | null
  ownerResponseAt: string | null
  photos: Photo[]
  user: { id: string; name: string; username: string; image: string | null }
}

type CrowdPeriod = { avg: number | null; count: number }

type BathroomDetail = {
  id: string
  name: string
  address: string
  type: string
  accessible: boolean
  changingTable: boolean
  genderNeutral: boolean
  requiresKey: boolean
  photos: Photo[]
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
  claimedBy: { id: string; name: string; username: string } | null
  verified: boolean
  claimedByUserId: string | null
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

const COST_LABELS_EDIT = ["Free", "$", "$$", "$$$"]

function EditReviewModal({ review, onClose, onSaved }: {
  review: Review
  onClose: () => void
  onSaved: () => void
}) {
  const [ratings, setRatings] = useState({
    cleanliness: review.cleanliness,
    supplies:    review.supplies,
    smell:       review.smell,
    privacy:     review.privacy,
    cost:        review.cost,
    crowded:     review.crowded,
  })
  const [notes, setNotes]           = useState(review.notes ?? "")
  const [directions, setDirections] = useState(review.directions ?? "")
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>(review.photos ?? [])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [newUrls, setNewUrls]       = useState<string[]>([])
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)

  const totalPhotos = existingPhotos.length + newUrls.length

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || totalPhotos >= 5) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (res.ok) {
      const { url } = await res.json()
      setNewUrls((p) => [...p, url])
    }
    setUploading(false)
    e.target.value = ""
  }

  function removeExisting(photo: Photo) {
    setExistingPhotos((p) => p.filter((x) => x.id !== photo.id))
    setRemovedIds((p) => [...p, photo.id])
  }

  function RatingRow({ label, field, max = 5 }: { label: string; field: keyof typeof ratings; max?: number }) {
    const val = ratings[field]
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <Label className="font-medium">{label}</Label>
          <span className="font-bold text-primary text-sm">{val}/{max}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRatings((r) => ({ ...r, [field]: n }))}
              className={`flex-1 h-8 rounded-lg text-sm font-semibold transition-all ${n <= val ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ratings,
        notes,
        directions,
        addPhotoUrls:  newUrls,
        removePhotoIds: removedIds,
      }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="font-bold text-lg">Edit Review</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <RatingRow label="🧹 Cleanliness" field="cleanliness" />
          <RatingRow label="🧴 Supplies"    field="supplies" />
          <RatingRow label="🌸 Smell"       field="smell" />
          <RatingRow label="🔒 Privacy"     field="privacy" />
          <RatingRow label="👥 How Busy?"   field="crowded" />

          {/* Cost */}
          <div className="space-y-1.5">
            <Label className="font-medium">Cost to Access</Label>
            <div className="flex gap-2">
              {COST_LABELS_EDIT.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRatings((r) => ({ ...r, cost: i }))}
                  className={`flex-1 h-8 rounded-lg text-sm font-semibold transition-all ${ratings.cost === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Directions</Label>
            <Textarea value={directions} onChange={(e) => setDirections(e.target.value)} rows={2} placeholder="How to find it…" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything that stood out…" />
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <Label>Photos <span className="text-muted-foreground font-normal">(up to 5)</span></Label>
            <div className="flex gap-2 flex-wrap">
              {existingPhotos.map((p) => (
                <div key={p.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExisting(p)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >✕</button>
                </div>
              ))}
              {newUrls.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="New photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewUrls((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >✕</button>
                </div>
              ))}
              {totalPhotos < 5 && (
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <span className="text-2xl text-muted-foreground">{uploading ? "…" : "+"}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Add photo</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoSelect} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function BathroomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user: clerkUser } = useUser()
  const [bathroom, setBathroom] = useState<BathroomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [rank, setRank] = useState<{ rank: number | null; total: number; city: string | null } | null>(null)
  const [claimMessage, setClaimMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")
  const [responseLoading, setResponseLoading] = useState(false)

  const fetchBathroom = useCallback(async () => {
    const res = await fetch(`/api/bathrooms/${id}`)
    if (res.ok) setBathroom(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { fetchBathroom() }, [fetchBathroom])

  useEffect(() => {
    fetch(`/api/leaderboard?bathroomId=${id}`)
      .then((r) => r.json())
      .then((d) => setRank(d))
      .catch(() => {})
  }, [id])

  // Read ?claim= param set by the Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("claim")
    if (!status) return
    window.history.replaceState({}, "", window.location.pathname)
    const messages: Record<string, { text: string; ok: boolean }> = {
      verified:       { text: "✅ Your business is now verified on BeliAche!", ok: true },
      no_match:       { text: "No matching location found in your Google Business account.", ok: false },
      no_business:    { text: "No Google Business locations found for your account.", ok: false },
      taken:          { text: "This bathroom has already been claimed by someone else.", ok: false },
      not_configured: { text: "Google Business verification isn't configured yet.", ok: false },
      error:          { text: "Something went wrong. Please try again.", ok: false },
    }
    const msg = messages[status]
    if (msg) {
      setClaimMessage(msg)
      setTimeout(() => setClaimMessage(null), 6000)
    }
  }, [])

  async function handleUnclaim() {
    await fetch(`/api/bathrooms/${id}/claim`, { method: "DELETE" })
    await fetchBathroom()
  }

  async function submitResponse(reviewId: string) {
    if (!responseText.trim()) return
    setResponseLoading(true)
    await fetch(`/api/reviews/${reviewId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: responseText }),
    })
    setRespondingTo(null)
    setResponseText("")
    setResponseLoading(false)
    await fetchBathroom()
  }

  async function deleteResponse(reviewId: string) {
    await fetch(`/api/reviews/${reviewId}/respond`, { method: "DELETE" })
    await fetchBathroom()
  }

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
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className="capitalize">{bathroom.type}</Badge>
            {bathroom.verified && (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-xs gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified Business
              </Badge>
            )}
            {rank?.rank != null && (
              <Link href={rank.city ? `/leaderboard?city=${encodeURIComponent(rank.city)}` : "/leaderboard"}>
                <Badge className="bg-amber-400/20 text-amber-800 border-amber-300 hover:bg-amber-400/30 text-xs cursor-pointer">
                  🏆 #{rank.rank} of {rank.total}{rank.city ? ` in ${rank.city}` : ""}
                </Badge>
              </Link>
            )}
            {bathroom.accessible    && <Badge variant="outline" className="text-xs">♿ Accessible</Badge>}
            {bathroom.changingTable && <Badge variant="outline" className="text-xs">👶 Changing Table</Badge>}
            {bathroom.genderNeutral && <Badge variant="outline" className="text-xs">⚧ Gender Neutral</Badge>}
            {bathroom.requiresKey   && <Badge variant="outline" className="text-xs">🔑 Key Required</Badge>}
            <span className="text-xs text-muted-foreground">Added by @{bathroom.addedBy.username}</span>
          </div>

          {/* Claim / unclaim */}
          {!bathroom.verified && !bathroom.claimedByUserId && clerkUser && (
            <a
              href={`/api/verify-business/start?bathroomId=${bathroom.id}`}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Store className="h-3.5 w-3.5" />
              Own this business? Verify with Google Business
            </a>
          )}
          {bathroom.claimedByUserId === clerkUser?.id && (
            <button
              onClick={handleUnclaim}
              className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove my claim
            </button>
          )}

          {/* Claim status message */}
          {claimMessage && (
            <p className={`mt-2 text-xs font-medium ${claimMessage.ok ? "text-emerald-600" : "text-red-500"}`}>
              {claimMessage.text}
            </p>
          )}
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

      {/* Photo grid */}
      {bathroom.photos.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Photos</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {bathroom.photos.map((p) => (
              <button
                key={p.id}
                onClick={() => setLightboxUrl(p.url)}
                className="aspect-square rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="Bathroom photo" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
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
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-primary fill-primary" />
                        <span className="font-bold text-primary">{r.overall}/10</span>
                      </div>
                      {clerkUser?.id === r.user.id && (
                        <button
                          onClick={() => setEditingReview(r)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Edit review"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
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
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {r.photos.map((p) => (
                        <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="Photo" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(r.visitedAt).toLocaleDateString()}
                  </p>

                  {/* Owner response */}
                  {r.ownerResponse && (
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                        <ShieldCheck className="h-3 w-3" /> Owner Response
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{r.ownerResponse}</p>
                      {bathroom.claimedByUserId === clerkUser?.id && (
                        <button
                          onClick={() => deleteResponse(r.id)}
                          className="text-xs text-muted-foreground hover:text-destructive mt-1 transition-colors"
                        >
                          Delete response
                        </button>
                      )}
                    </div>
                  )}

                  {/* Owner reply box */}
                  {!r.ownerResponse && bathroom.claimedByUserId === clerkUser?.id && (
                    respondingTo === r.id ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder="Write a response as the business owner…"
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="text-sm min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => submitResponse(r.id)}
                            disabled={responseLoading || !responseText.trim()}
                            className="h-8"
                          >
                            {responseLoading ? "Posting…" : "Post Response"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setRespondingTo(null); setResponseText("") }}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRespondingTo(r.id)}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3 w-3" /> Respond as owner
                      </button>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit review modal */}
      {editingReview && (
        <EditReviewModal
          review={editingReview}
          onClose={() => setEditingReview(null)}
          onSaved={fetchBathroom}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/40 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
