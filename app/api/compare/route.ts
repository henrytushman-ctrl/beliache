import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"
import { calculateElo } from "@/lib/elo"

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

// ─── GET /api/compare — position a newly rated bathroom within the user's list ─

const MAX_COMPARISONS_PER_BATHROOM = 4

export async function GET(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const focusId = searchParams.get("id") ?? null

  // Pool: only bathrooms this user has personally reviewed
  const pool = await prisma.bathroom.findMany({
    where: { reviews: { some: { userId: user.id } } },
    include: {
      reviews: {
        select: { userId: true, overall: true, cleanliness: true, smell: true, supplies: true, privacy: true },
      },
    },
    orderBy: { eloRating: "desc" },
  })

  if (pool.length < 2) {
    return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
  }

  // Only this user's comparison votes
  const userComps = await prisma.comparison.findMany({
    where: { userId: user.id },
    select: { bathroomAId: true, bathroomBId: true, winnerId: true },
  })

  // Per-bathroom history based solely on this user's votes
  type Rec = { beaten: Set<string>; lostTo: Set<string>; count: number }
  const history = new Map<string, Rec>()
  for (const b of pool) history.set(b.id, { beaten: new Set(), lostTo: new Set(), count: 0 })

  for (const comp of userComps) {
    const aRec = history.get(comp.bathroomAId)
    const bRec = history.get(comp.bathroomBId)
    if (!aRec && !bRec) continue
    if (aRec) aRec.count++
    if (bRec) bRec.count++
    if (comp.winnerId === comp.bathroomAId) {
      aRec?.beaten.add(comp.bathroomBId)
      bRec?.lostTo.add(comp.bathroomAId)
    } else if (comp.winnerId === comp.bathroomBId) {
      bRec?.beaten.add(comp.bathroomAId)
      aRec?.lostTo.add(comp.bathroomBId)
    } else {
      // Tie — treat each as a reference point on both sides
      aRec?.beaten.add(comp.bathroomBId); aRec?.lostTo.add(comp.bathroomBId)
      bRec?.beaten.add(comp.bathroomAId); bRec?.lostTo.add(comp.bathroomAId)
    }
  }

  function isSettled(b: (typeof pool)[0]): boolean {
    const rec = history.get(b.id)
    if (!rec || rec.count === 0) return false
    if (rec.count >= MAX_COMPARISONS_PER_BATHROOM) return true

    const beatenElos = pool.filter(x => rec.beaten.has(x.id)).map(x => x.eloRating)
    const lostToElos = pool.filter(x => rec.lostTo.has(x.id)).map(x => x.eloRating)

    // Settled at an extreme position
    if (lostToElos.length === 0 && beatenElos.length > 0) {
      if (b.eloRating >= Math.max(...pool.map(x => x.eloRating))) return true
    }
    if (beatenElos.length === 0 && lostToElos.length > 0) {
      if (b.eloRating <= Math.min(...pool.map(x => x.eloRating))) return true
    }

    // Settled when bracket is closed: beaten one, lost to an adjacent one
    if (beatenElos.length > 0 && lostToElos.length > 0) {
      const maxBeaten = Math.max(...beatenElos)
      const minLostTo = Math.min(...lostToElos)
      if (minLostTo - maxBeaten < 100) return true  // too close to call
      const inBetween = pool.filter(
        x => x.id !== b.id && x.eloRating > maxBeaten && x.eloRating < minLostTo
      )
      if (inBetween.length === 0) return true
    }

    return false
  }

  // Focus: use pinned ID if provided, otherwise pick the least-compared unsettled bathroom
  let focus: (typeof pool)[0] | undefined

  if (focusId) {
    focus = pool.find(b => b.id === focusId)
  } else {
    const unsettled = pool.filter(b => !isSettled(b))
    if (unsettled.length === 0) {
      return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
    }
    focus = unsettled.reduce((a, b) =>
      (history.get(a.id)?.count ?? 0) <= (history.get(b.id)?.count ?? 0) ? a : b
    )
  }

  if (!focus) {
    return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
  }

  // If the pinned bathroom is already settled, signal done
  if (focusId && isSettled(focus)) {
    return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
  }

  const focusRec = history.get(focus.id)!
  const alreadyFaced = new Set([...focusRec.beaten, ...focusRec.lostTo, focus.id])
  const candidates = pool.filter(b => !alreadyFaced.has(b.id))

  if (candidates.length === 0) {
    return NextResponse.json({ error: "not_enough_bathrooms" }, { status: 404 })
  }

  // Sub-score average using only this user's own reviews
  function subAvg(b: (typeof pool)[0]): number | null {
    const mine = b.reviews.filter(r => r.userId === user!.id)
    if (mine.length === 0) return null
    return mine.reduce((s, r) => s + r.cleanliness + r.smell + r.supplies + r.privacy, 0) / (mine.length * 4)
  }

  let opponent: (typeof pool)[0]

  if (focusRec.count === 0) {
    // First comparison: closest sub-score average to the new bathroom
    const focusAvg = subAvg(focus)
    opponent = focusAvg !== null
      ? candidates.reduce((best, c) => {
          const cAvg = subAvg(c) ?? Infinity
          const bAvg = subAvg(best) ?? Infinity
          return Math.abs(cAvg - focusAvg) < Math.abs(bAvg - focusAvg) ? c : best
        })
      : candidates[0]
  } else {
    // Subsequent: binary search toward the midpoint of the bracket
    const beatenElos = pool.filter(x => focusRec.beaten.has(x.id)).map(x => x.eloRating)
    const lostToElos = pool.filter(x => focusRec.lostTo.has(x.id)).map(x => x.eloRating)
    const allElos = pool.map(x => x.eloRating)

    let targetElo: number
    if (beatenElos.length > 0 && lostToElos.length > 0) {
      targetElo = (Math.max(...beatenElos) + Math.min(...lostToElos)) / 2
    } else if (beatenElos.length > 0) {
      targetElo = (Math.max(...beatenElos) + Math.max(...allElos)) / 2
    } else {
      targetElo = (Math.min(...lostToElos) + Math.min(...allElos)) / 2
    }

    opponent = candidates.reduce((best, c) =>
      Math.abs(c.eloRating - targetElo) < Math.abs(best.eloRating - targetElo) ? c : best
    )
  }

  return NextResponse.json({
    a: bathroomCard(focus),
    b: bathroomCard(opponent),
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
