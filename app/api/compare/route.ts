import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"
import { calculateElo, pairScore } from "@/lib/elo"

// ─── Shape returned for each card in the pair ───────────────────────────────

function bathroomCard(b: {
  id: string
  name: string
  address: string
  type: string
  eloRating: number
  comparisons: number
  wins: number
  losses: number
  ties: number
  reviews: Array<{
    overall: number
    cleanliness: number
    smell: number
    supplies: number
    privacy: number
  }>
}) {
  const count = b.reviews.length
  const avg = (field: keyof (typeof b.reviews)[0]) =>
    count > 0
      ? Math.round((b.reviews.reduce((s, r) => s + (r[field] as number), 0) / count) * 10) / 10
      : null

  return {
    id: b.id,
    name: b.name,
    address: b.address,
    type: b.type,
    eloRating: Math.round(b.eloRating),
    comparisons: b.comparisons,
    wins: b.wins,
    losses: b.losses,
    ties: b.ties,
    reviewCount: count,
    avgOverall: avg("overall"),
    avgCleanliness: avg("cleanliness"),
    avgSmell: avg("smell"),
    avgSupplies: avg("supplies"),
    avgPrivacy: avg("privacy"),
  }
}

// ─── GET /api/compare — return a smart pair for the current user ─────────────

export async function GET() {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only compare bathrooms that have at least one review (so we have data to show)
  const bathrooms = await prisma.bathroom.findMany({
    where: { reviews: { some: {} } },
    include: {
      reviews: {
        select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true },
      },
    },
  })

  if (bathrooms.length < 2) {
    return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
  }

  // Pairs this user has seen in the last 14 days — skip them to keep it fresh
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const recent = await prisma.comparison.findMany({
    where: { userId: user.id, createdAt: { gte: cutoff } },
    select: { bathroomAId: true, bathroomBId: true },
  })
  const recentSet = new Set(recent.map((c) => [c.bathroomAId, c.bathroomBId].sort().join("|")))

  // Score every candidate pair — lower is better (more novel + more uncertain)
  let best: { a: (typeof bathrooms)[0]; b: (typeof bathrooms)[0]; score: number } | null = null

  for (let i = 0; i < bathrooms.length; i++) {
    for (let j = i + 1; j < bathrooms.length; j++) {
      const a = bathrooms[i]
      const b = bathrooms[j]
      const key = [a.id, b.id].sort().join("|")
      if (recentSet.has(key)) continue

      const score = pairScore(a.eloRating, b.eloRating, a.comparisons, b.comparisons)
      if (best === null || score < best.score) best = { a, b, score }
    }
  }

  // Fallback: if every pair was seen recently, just return the closest-Elo pair
  if (!best) {
    for (let i = 0; i < bathrooms.length; i++) {
      for (let j = i + 1; j < bathrooms.length; j++) {
        const a = bathrooms[i]
        const b = bathrooms[j]
        const score = Math.abs(a.eloRating - b.eloRating)
        if (best === null || score < best.score) best = { a, b, score }
      }
    }
  }

  if (!best) return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })

  return NextResponse.json({
    a: bathroomCard(best.a),
    b: bathroomCard(best.b),
  })
}

// ─── POST /api/compare — record result and update Elo ───────────────────────

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bathroomAId, bathroomBId, winnerId } = await req.json()

  if (!bathroomAId || !bathroomBId) {
    return NextResponse.json({ error: "bathroomAId and bathroomBId required" }, { status: 400 })
  }
  if (winnerId && winnerId !== bathroomAId && winnerId !== bathroomBId) {
    return NextResponse.json({ error: "winnerId must be one of the two bathrooms" }, { status: 400 })
  }

  const [bathroomA, bathroomB] = await Promise.all([
    prisma.bathroom.findUnique({ where: { id: bathroomAId } }),
    prisma.bathroom.findUnique({ where: { id: bathroomBId } }),
  ])

  if (!bathroomA || !bathroomB) {
    return NextResponse.json({ error: "Bathroom not found" }, { status: 404 })
  }

  // Determine outcome from the caller's perspective (A vs B)
  const outcome: "a" | "b" | "tie" =
    winnerId === null || winnerId === undefined
      ? "tie"
      : winnerId === bathroomAId
      ? "a"
      : "b"

  const { newRatingA, newRatingB, deltaA, deltaB } = calculateElo(
    bathroomA.eloRating,
    bathroomB.eloRating,
    bathroomA.comparisons,
    bathroomB.comparisons,
    outcome
  )

  // Persist in a transaction: create Comparison + update both Bathroom ratings
  await prisma.$transaction([
    prisma.comparison.create({
      data: {
        userId: user.id,
        bathroomAId,
        bathroomBId,
        winnerId: winnerId ?? null,
      },
    }),
    prisma.bathroom.update({
      where: { id: bathroomAId },
      data: {
        eloRating: newRatingA,
        comparisons: { increment: 1 },
        wins: outcome === "a" ? { increment: 1 } : undefined,
        losses: outcome === "b" ? { increment: 1 } : undefined,
        ties: outcome === "tie" ? { increment: 1 } : undefined,
      },
    }),
    prisma.bathroom.update({
      where: { id: bathroomBId },
      data: {
        eloRating: newRatingB,
        comparisons: { increment: 1 },
        wins: outcome === "b" ? { increment: 1 } : undefined,
        losses: outcome === "a" ? { increment: 1 } : undefined,
        ties: outcome === "tie" ? { increment: 1 } : undefined,
      },
    }),
  ])

  return NextResponse.json({
    deltaA,
    deltaB,
    newRatingA: Math.round(newRatingA),
    newRatingB: Math.round(newRatingB),
  })
}
