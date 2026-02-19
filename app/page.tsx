"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, UserPlus, Check, X } from "lucide-react"

const COST_LABELS = ["Free", "$", "$$", "$$$"]

type FeedItem = {
  id: string
  overall: number
  cleanliness: number
  supplies: number
  smell: number
  privacy: number
  cost: number
  crowded: number
  notes: string | null
  createdAt: string
  myRank: number | null
  user: { id: string; name: string; username: string; image: string | null }
  bathroom: { id: string; name: string; address: string; type: string }
}

type Friendship = {
  id: string
  status: string
  requesterId: string
  addresseeId: string
  requester: { id: string; name: string; username: string; image: string | null }
  addressee: { id: string; name: string; username: string; image: string | null }
}

type SearchUser = { id: string; name: string; username: string; image: string | null }

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  const fetchData = useCallback(async () => {
    const [feedRes, friendRes] = await Promise.all([
      fetch("/api/feed"),
      fetch("/api/friends"),
    ])
    setFeed(await feedRes.json())
    setFriendships(await friendRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function searchUsers() {
    if (!searchQ.trim()) return
    setSearching(true)
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`)
    setSearchResults(await res.json())
    setSearching(false)
  }

  async function sendFriendRequest(addresseeId: string) {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId }),
    })
    fetchData()
    setSearchResults([])
    setSearchQ("")
  }

  async function respondToRequest(friendshipId: string, action: "accept" | "decline") {
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    })
    fetchData()
  }

  const DEMO_USER_ID = "demo0000000000000000000000"

  const pendingRequests = friendships.filter(
    (f) => f.status === "pending" && f.addresseeId === DEMO_USER_ID
  )

  const friendIds = new Set(
    friendships
      .filter((f) => f.status === "accepted")
      .map((f) => (f.requesterId === DEMO_USER_ID ? f.addresseeId : f.requesterId))
  )

  const pendingIds = new Set(
    friendships.map((f) => (f.requesterId === DEMO_USER_ID ? f.addresseeId : f.requesterId))
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Feed</h1>

      {/* Friend search */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Find Friends</p>
          <div className="flex gap-2">
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              placeholder="Search by name or username…"
              className="flex-1"
            />
            <Button onClick={searchUsers} disabled={searching} variant="outline" size="sm">
              Search
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <Link href={`/profile/${u.username}`} className="flex items-center gap-2 hover:opacity-80">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback>{u.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-gray-400">@{u.username}</div>
                    </div>
                  </Link>
                  {friendIds.has(u.id) ? (
                    <Badge variant="secondary">Friends</Badge>
                  ) : pendingIds.has(u.id) ? (
                    <Badge variant="secondary">Pending</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => sendFriendRequest(u.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending friend requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Friend Requests</p>
          {pendingRequests.map((f) => (
            <Card key={f.id}>
              <CardContent className="pt-3 pb-3 flex items-center justify-between">
                <Link href={`/profile/${f.requester.username}`} className="flex items-center gap-2 hover:opacity-80">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={f.requester.image ?? undefined} />
                    <AvatarFallback>{f.requester.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{f.requester.name}</div>
                    <div className="text-xs text-gray-400">@{f.requester.username}</div>
                  </div>
                </Link>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondToRequest(f.id, "accept")} className="h-8 w-8 p-0">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respondToRequest(f.id, "decline")} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🚽</div>
          <p className="font-medium text-gray-600 mb-1">Nothing here yet</p>
          <p className="text-sm text-gray-400 mb-4">Add friends or rate a bathroom to get started</p>
          <Link href="/rate">
            <Button>Rate a Bathroom</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${item.user.username}`}>
                    <Avatar className="h-9 w-9 shrink-0 hover:opacity-80">
                      <AvatarImage src={item.user.image ?? undefined} />
                      <AvatarFallback>{item.user.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <Link href={`/profile/${item.user.username}`} className="font-semibold hover:underline">
                        {item.user.name}
                      </Link>{" "}
                      <span className="text-gray-500">rated</span>{" "}
                      <Link href={`/bathroom/${item.bathroom.id}`} className="font-medium hover:underline text-emerald-700">
                        {item.bathroom.name}
                      </Link>
                      {item.myRank && (
                        <span className="text-gray-500"> — #{item.myRank} on your list</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.bathroom.address}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                        <span className="font-bold text-emerald-600 text-sm">{item.overall}/10</span>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-400 flex-wrap">
                        <span>🧹 {item.cleanliness}</span>
                        <span>🧴 {item.supplies}</span>
                        <span>🌸 {item.smell}</span>
                        <span>🔒 {item.privacy}</span>
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{COST_LABELS[item.cost]}</span>
                        <span>👥 {item.crowded}/5</span>
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize ml-auto">{item.bathroom.type}</Badge>
                    </div>

                    {item.notes && (
                      <p className="text-sm text-gray-600 italic mt-2 border-l-2 border-gray-200 pl-2">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
