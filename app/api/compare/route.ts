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

  // Comparisons are one-time seeding events.
  // Pool: bathrooms that have never been compared (comparisons === 0) with at least one review.
  const uncompared = await prisma.bathroom.findMany({
    where: { reviews: { some: {} }, comparisons: 0 },
    include: {
      reviews: {
        select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true },
      },
    },
  })

  if (uncompared.length === 0) {
    return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
  }

  // If 2+ uncompared bathrooms exist, pair them against each other.
  // If only 1, pair it against any existing bathroom so it still gets seeded.
  let best: { a: (typeof uncompared)[0]; b: (typeof uncompared)[0]; score: number } | null = null

  if (uncompared.length >= 2) {
    for (let i = 0; i < uncompared.length; i++) {
      for (let j = i + 1; j < uncompared.length; j++) {
        const a = uncompared[i]
        const b = uncompared[j]
        const score = pairScore(a.eloRating, b.eloRating, a.comparisons, b.comparisons)
        if (best === null || score < best.score) best = { a, b, score }
      }
    }
  } else {
    // Only 1 uncompared bathroom — pair it with any existing reviewed bathroom
    const existing = await prisma.bathroom.findFirst({
      where: { reviews: { some: {} }, comparisons: { gt: 0 } },
      include: {
        reviews: {
          select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true },
        },
      },
      orderBy: { eloRating: "desc" },
    })
    if (existing) {
      best = { a: uncompared[0], b: existing, score: 0 }
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
