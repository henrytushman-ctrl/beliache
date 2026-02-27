"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, UserCheck, Search, X, Check, MapPin, Link2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type FriendUser = {
  id: string
  name: string
  username: string
  image: string | null
  _count: { reviews: number }
}

type Friendship = {
  id: string
  status: string
  requesterId: string
  addresseeId: string
  requester: FriendUser
  addressee: FriendUser
}

type SearchUser = {
  id: string
  name: string
  username: string
  image: string | null
}

type FeedItem = {
  id: string
  overall: number
  cleanliness: number
  smell: number
  supplies: number
  privacy: number
  cost: number
  notes: string | null
  createdAt: string
  myRank: number | null
  user: { id: string; name: string; username: string; image: string | null }
  bathroom: { id: string; name: string; address: string; type: string }
}

const COST_LABELS = ["Free", "$", "$$", "$$$"]

type Tab = "friends" | "activity"

export default function FriendsPage() {
  const { user: clerkUser } = useUser()
  const myId = clerkUser?.id

  const myUsername = clerkUser?.username

  const [tab, setTab] = useState<Tab>("friends")
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchFriends = useCallback(async () => {
    const res = await fetch("/api/friends")
    if (res.ok) setFriendships(await res.json())
    setLoading(false)
  }, [])

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true)
    const res = await fetch("/api/feed")
    if (res.ok) setFeed(await res.json())
    setFeedLoading(false)
  }, [])

  useEffect(() => { fetchFriends() }, [fetchFriends])

  useEffect(() => {
    if (tab === "activity") fetchFeed()
  }, [tab, fetchFeed])

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!query.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (res.ok) setSearchResults(await res.json())
      setSearching(false)
    }, 300)
  }, [query])

  async function sendRequest(addresseeId: string) {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId }),
    })
    fetchFriends()
  }

  async function respond(friendshipId: string, action: "accept" | "decline") {
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    })
    fetchFriends()
  }

  async function unfriend(friendshipId: string) {
    await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId }),
    })
    fetchFriends()
  }

  if (!myId) return null

  const friends = friendships.filter((f) => f.status === "accepted")
  const pendingIn = friendships.filter(
    (f) => f.status === "pending" && f.addresseeId === myId
  )
  const pendingSent = friendships.filter(
    (f) => f.status === "pending" && f.requesterId === myId
  )

  function getStatus(userId: string) {
    const f = friendships.find(
      (f) =>
        (f.requesterId === myId && f.addresseeId === userId) ||
        (f.addresseeId === myId && f.requesterId === userId)
    )
    return f ? f.status : null
  }

  function getOtherUser(f: Friendship): FriendUser {
    return f.requesterId === myId ? f.addressee : f.requester
  }

  async function copyFriendLink() {
    if (!myUsername) return
    const url = `${window.location.origin}/profile/${myUsername}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function timeAgo(dateStr: string) {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (secs < 60) return "just now"
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
    return `${Math.floor(secs / 86400)}d ago`
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Friends</h1>
        <button
          onClick={copyFriendLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-accent transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" />
          {linkCopied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl">
        {([["friends", "Friends"], ["activity", "Activity"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
            {t === "friends" && pendingIn.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                {pendingIn.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        <div className="space-y-6">
          {/* Incoming requests */}
          {pendingIn.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Requests · {pendingIn.length}
              </h2>
              {pendingIn.map((f) => {
                const u = f.requester
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-3.5"
                  >
                    <Link href={`/profile/${u.username}`}>
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={u.image ?? undefined} />
                        <AvatarFallback className="text-sm font-bold bg-brand-100 text-primary">
                          {u.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${u.username}`}>
                        <p className="font-semibold text-sm truncate hover:underline">{u.name}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </Link>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => respond(f.id, "accept")} className="h-8 px-3">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respond(f.id, "decline")}
                        className="h-8 px-3"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* Search */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Find People
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or @username…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {query.trim() && (
              <div className="space-y-1.5">
                {searching ? (
                  <p className="text-sm text-muted-foreground text-center py-3">Searching…</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No users found</p>
                ) : (
                  searchResults.map((u) => {
                    const status = getStatus(u.id)
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5"
                      >
                        <Link href={`/profile/${u.username}`}>
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={u.image ?? undefined} />
                            <AvatarFallback className="text-sm font-bold bg-brand-100 text-primary">
                              {u.name?.[0] ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${u.username}`}>
                            <p className="font-semibold text-sm truncate hover:underline">{u.name}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </Link>
                        </div>
                        {status === "accepted" ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5" /> Friends
                          </span>
                        ) : status === "pending" ? (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 shrink-0"
                            onClick={() => sendRequest(u.id)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </section>

          {/* Friends list */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Your Friends
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-secondary rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">👋</p>
                <p className="font-semibold text-foreground">No friends yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Search above to find BeliAchers.
                </p>
              </div>
            ) : (
              friends.map((f) => {
                const u = getOtherUser(f)
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 group hover:border-primary/20 transition-all"
                  >
                    <Link href={`/profile/${u.username}`}>
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={u.image ?? undefined} />
                        <AvatarFallback className="text-sm font-bold bg-brand-100 text-primary">
                          {u.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${u.username}`}>
                        <p className="font-semibold text-sm truncate hover:underline">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          @{u.username} · {u._count.reviews} {u._count.reviews === 1 ? "review" : "reviews"}
                        </p>
                      </Link>
                    </div>
                    <button
                      onClick={() => unfriend(f.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-all px-2 py-1 rounded-lg hover:bg-destructive/10"
                    >
                      Remove
                    </button>
                  </div>
                )
              })
            )}

            {pendingSent.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Sent requests</p>
                {pendingSent.map((f) => {
                  const u = f.addressee
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3 opacity-70"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={u.image ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-brand-100 text-primary">
                          {u.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">@{u.username} · request pending</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-3">
          {feedLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-2">🚽</p>
              <p className="font-semibold text-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add friends to see their bathroom reviews here.
              </p>
            </div>
          ) : (
            feed.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
                {/* User + time */}
                <div className="flex items-center gap-2.5">
                  <Link href={`/profile/${item.user.username}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={item.user.image ?? undefined} />
                      <AvatarFallback className="text-xs font-bold bg-brand-100 text-primary">
                        {item.user.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      <Link href={`/profile/${item.user.username}`} className="hover:underline">
                        {item.user.name}
                      </Link>{" "}
                      <span className="font-normal text-muted-foreground">reviewed</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
                </div>

                {/* Bathroom */}
                <Link href={`/bathroom/${item.bathroom.id}`}>
                  <div className="bg-secondary/50 rounded-xl p-3 hover:bg-secondary transition-colors">
                    <p className="font-semibold text-sm truncate">{item.bathroom.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {item.bathroom.address}
                    </p>
                  </div>
                </Link>

                {/* Scores */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-black text-primary">{item.overall}/10</span>
                  <div className="flex gap-1.5 text-xs text-muted-foreground">
                    <span title="Cleanliness">🧹{item.cleanliness}</span>
                    <span title="Supplies">🧴{item.supplies}</span>
                    <span title="Smell">🌸{item.smell}</span>
                    <span title="Privacy">🔒{item.privacy}</span>
                  </div>
                  {item.cost !== undefined && (
                    <Badge variant="secondary" className="text-xs py-0">{COST_LABELS[item.cost]}</Badge>
                  )}
                  {item.myRank && (
                    <span className="text-xs text-muted-foreground">· Your rank #{item.myRank}</span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-sm text-muted-foreground italic line-clamp-2">"{item.notes}"</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
