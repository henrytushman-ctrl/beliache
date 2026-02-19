import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEMO_USER_ID = "demo0000000000000000000000"

export async function POST(req: NextRequest) {
  const { bathroomId, overall, cleanliness, supplies, smell, privacy, notes, cost, crowded } = await req.json()

  if (!bathroomId || overall == null) {
    return NextResponse.json({ error: "bathroomId and overall required" }, { status: 400 })
  }

  const userId = DEMO_USER_ID

  const review = await prisma.review.create({
    data: {
      userId,
      bathroomId,
      overall,
      cleanliness: cleanliness ?? 3,
      supplies: supplies ?? 3,
      smell: smell ?? 3,
      privacy: privacy ?? 3,
      notes: notes ?? null,
      cost: cost ?? 0,
      crowded: crowded ?? 3,
    },
  })

  // Auto-add to user ranking at the bottom (or update position if already exists)
  const existingRanking = await prisma.userRanking.findUnique({
    where: { userId_bathroomId: { userId, bathroomId } },
  })

  if (!existingRanking) {
    const maxRank = await prisma.userRanking.findFirst({
      where: { userId },
      orderBy: { position: "desc" },
    })
    const nextPosition = (maxRank?.position ?? 0) + 1

    await prisma.userRanking.create({
      data: { userId, bathroomId, position: nextPosition },
    })
  }

  return NextResponse.json(review)
}
