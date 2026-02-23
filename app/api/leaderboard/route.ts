import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || ""

  const bathrooms = await prisma.bathroom.findMany({
    where: {
      // Only show bathrooms that have been compared at least once OR reviewed
      AND: [
        type ? { type } : {},
        { OR: [{ comparisons: { gt: 0 } }, { reviews: { some: {} } }] },
      ],
    },
    include: {
      reviews: {
        select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true },
      },
      _count: { select: { reviews: true } },
    },
    orderBy: { eloRating: "desc" },
    take: 100,
  })

  const results = bathrooms.map((b, idx) => {
    const count = b.reviews.length
    const avg = (field: keyof (typeof b.reviews)[0]) =>
      count > 0
        ? Math.round((b.reviews.reduce((s, r) => s + (r[field] as number), 0) / count) * 10) / 10
        : null

    const winRate =
      b.comparisons > 0
        ? Math.round(((b.wins + b.ties * 0.5) / b.comparisons) * 100)
        : null

    return {
      rank: idx + 1,
      id: b.id,
      name: b.name,
      address: b.address,
      type: b.type,
      eloRating: Math.round(b.eloRating),
      wins: b.wins,
      losses: b.losses,
      ties: b.ties,
      comparisons: b.comparisons,
      winRate,
      reviewCount: count,
      avgOverall: avg("overall"),
    }
  })

  return NextResponse.json(results)
}
