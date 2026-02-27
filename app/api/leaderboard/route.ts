import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function parseCity(address: string): string | null {
  const parts = address.split(", ")
  return parts.length >= 3 ? parts[1] : null
}

async function getRankedBathrooms(city?: string) {
  const bathrooms = await prisma.bathroom.findMany({
    where: {
      AND: [
        { reviews: { some: {} } },
        city
          ? { OR: [{ city }, { city: null, address: { contains: city } }] }
          : {},
      ],
    },
    include: {
      reviews: { select: { overall: true, cost: true } },
    },
  })

  return bathrooms
    .map((b) => {
      const count = b.reviews.length
      const avgOverall =
        count > 0
          ? Math.round(
              (b.reviews.reduce((s, r) => s + r.overall, 0) / count) * 10
            ) / 10
          : null

      let modeCost: number | null = null
      if (count > 0) {
        const freq: Record<number, number> = {}
        for (const r of b.reviews) freq[r.cost] = (freq[r.cost] ?? 0) + 1
        modeCost = Number(
          Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
        )
      }

      const resolvedCity = b.city ?? parseCity(b.address)

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        city: resolvedCity,
        type: b.type,
        accessible: b.accessible,
        changingTable: b.changingTable,
        genderNeutral: b.genderNeutral,
        requiresKey: b.requiresKey,
        avgOverall,
        modeCost,
        reviewCount: count,
      }
    })
    .sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0))
    .map((b, i) => ({ ...b, rank: i + 1 }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get("city") || ""
  const bathroomId = searchParams.get("bathroomId") || ""

  // Return rank for a specific bathroom (used by detail page)
  if (bathroomId) {
    const allRanked = await getRankedBathrooms()
    const entry = allRanked.find((b) => b.id === bathroomId)
    return NextResponse.json({
      rank: entry?.rank ?? null,
      total: allRanked.length,
      city: entry?.city ?? null,
    })
  }

  const ranked = await getRankedBathrooms(city || undefined)

  // Distinct cities from all bathrooms that have reviews
  const allWithReviews = await prisma.bathroom.findMany({
    where: { reviews: { some: {} } },
    select: { city: true, address: true },
  })
  const cities = [
    ...new Set(
      allWithReviews
        .map((b) => b.city ?? parseCity(b.address))
        .filter((c): c is string => !!c)
    ),
  ].sort()

  return NextResponse.json({ bathrooms: ranked, cities })
}
