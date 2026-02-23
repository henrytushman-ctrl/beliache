"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MapPin, Star, UserPlus, UserCheck } from "lucide-react"

type UserProfile = {
  id: string
  name: string
  username: string
  image: string | null
  bio: string | null
  avgScore: number | null
  _count: { reviews: number }
  rankings: Array<{
    id: string
    position: number
    bathroomId: string
    bathroom: {
      id: string
      name: string
      address: string
      type: string
      reviews: Array<{ overall: number }>
    }
  }>
}

type Friendship = {
  id: string
  status: string
  requesterId: string
  addresseeId: string
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: clerkUser } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const [profileRes, friendRes] = await Promise.all([
      fetch(`/api/users/${username}`),
      fetch("/api/friends"),
    ])
    if (!profileRes.ok) { setLoading(false); return }

    const profileData: UserProfile = await profileRes.json()
    setProfile(profileData)

    const friends: Friendship[] = await friendRes.json()
    const match = friends.find(
      (f) =>
        (f.requesterId === clerkUser?.id && f.addresseeId === profileData.id) ||
        (f.addresseeId === clerkUser?.id && f.requesterId === profileData.id)
    )
    setFriendship(match ?? null)
    setLoading(false)
  }, [username, clerkUser?.id])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function sendFriendRequest() {
    if (!profile) return
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId: profile.id }),
    })
    fetchProfile()
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="h-24 bg-secondary rounded-2xl animate-pulse" />
        <div className="h-48 bg-secondary rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    )
  }

  const isOwnProfile = clerkUser?.id === profile.id
  const friendshipStatus = friendship?.status ?? null
  const isFriend = friendshipStatus === "accepted"
  const isPending = friendshipStatus === "pending"
  const topBathroom = profile.rankings[0]?.bathroom

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarImage src={profile.image ?? undefined} />
          <AvatarFallback className="text-xl font-bold bg-brand-100 text-primary">
            {profile.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{profile.name}</h1>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-foreground mt-1.5 leading-relaxed">{profile.bio}</p>}
          {!isOwnProfile && (
            <div className="mt-3">
              {isFriend ? (
                <Button size="sm" variant="outline" disabled>
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Friends
                </Button>
              ) : isPending ? (
                <Button size="sm" variant="outline" disabled>
                  Request Sent
                </Button>
              ) : (
                <Button size="sm" onClick={sendFriendRequest}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Friend
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-3 divide-x divide-border text-center">
            <div className="px-4">
              <div className="text-3xl font-black text-primary">{profile._count.reviews}</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">Reviewed</div>
            </div>
            <div className="px-4">
              <div className="text-3xl font-black text-primary">
                {profile.avgScore ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">Avg Score</div>
            </div>
            <div className="px-4 min-w-0">
              {topBathroom ? (
                <>
                  <Link
                    href={`/bathroom/${topBathroom.id}`}
                    className="text-sm font-semibold text-primary hover:underline line-clamp-2 leading-tight"
                  >
                    {topBathroom.name}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5 font-medium">Top Pick</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-muted-foreground/30">—</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-medium">Top Pick</div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Rankings */}
      <div>
        <h2 className="font-semibold text-lg mb-3">
          {isOwnProfile ? "My" : `${profile.name}'s`} Rankings
        </h2>
        {profile.rankings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">🚽</p>
            <p className="font-medium">No bathrooms ranked yet</p>
            {isOwnProfile && (
              <Link href="/rate" className="text-primary hover:underline text-sm mt-2 block font-medium">
                Rate your first bathroom →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {profile.rankings.map((r, index) => {
              const review = r.bathroom.reviews[0]
              const medalStyles = [
                "bg-amber-400 text-amber-900",
                "bg-zinc-300 text-zinc-700",
                "bg-orange-700 text-orange-100",
              ]
              return (
                <Link key={r.id} href={`/bathroom/${r.bathroomId}`}>
                  <div className="flex items-center gap-3 bg-card rounded-2xl border border-border p-3.5 hover:shadow-warm-md hover:border-primary/20 transition-all duration-150">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        index < 3 ? medalStyles[index] : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{r.bathroom.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {r.bathroom.address}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {review && (
                        <>
                          <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                          <span className="text-sm font-bold text-primary">{review.overall}/10</span>
                        </>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">{r.bathroom.type}</Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
