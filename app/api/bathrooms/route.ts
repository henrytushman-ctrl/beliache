import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const type = searchParams.get("type") || ""

  const bathrooms = await prisma.bathroom.findMany({
    where: {
      AND: [
        q ? { OR: [{ name: { contains: q } }, { address: { contains: q } }] } : {},
        type ? { type } : {},
      ],
    },
    include: {
      reviews: { select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true, cost: true, crowded: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const results = bathrooms.map((b) => {
    const count = b.reviews.length
    const avg = (field: keyof (typeof b.reviews)[0]) =>
      count > 0
        ? Math.round((b.reviews.reduce((s, r) => s + (r[field] as number), 0) / count) * 10) / 10
        : null

    // mode cost
    let modeCost: number | null = null
    if (count > 0) {
      const freq: Record<number, number> = {}
      for (const r of b.reviews) freq[r.cost] = (freq[r.cost] ?? 0) + 1
      modeCost = Number(Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0])
    }

    return {
      ...b,
      reviews: undefined,
      avgOverall: avg("overall"),
      avgCleanliness: avg("cleanliness"),
      avgSmell: avg("smell"),
      avgSupplies: avg("supplies"),
      avgPrivacy: avg("privacy"),
      avgCrowded: avg("crowded"),
      modeCost,
      reviewCount: count,
    }
  })

  return NextResponse.json(results)
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, address, lat, lng, type } = await req.json()
  if (!name || !address) {
    return NextResponse.json({ error: "Name and address required" }, { status: 400 })
  }

  const bathroom = await prisma.bathroom.create({
    data: {
      name,
      address,
      lat: lat ?? null,
      lng: lng ?? null,
      type: type ?? "public",
      addedById: user.id,
    },
  })

  return NextResponse.json(bathroom)
}
