import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const bathroom = await prisma.bathroom.findUnique({
    where: { id },
    include: {
      reviews: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      addedBy: { select: { id: true, name: true, username: true } },
      _count: { select: { reviews: true } },
    },
  })

  if (!bathroom) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const reviews = bathroom.reviews
  const count = reviews.length
  const avg = (field: "overall" | "cleanliness" | "smell" | "supplies" | "privacy") =>
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + r[field], 0) / count) * 10) / 10
      : null

  // mode cost
  let modeCost: number | null = null
  if (count > 0) {
    const freq: Record<number, number> = {}
    for (const r of reviews) freq[r.cost] = (freq[r.cost] ?? 0) + 1
    modeCost = Number(Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0])
  }

  // crowd by time period
  const buckets = { night: [] as number[], morning: [] as number[], afternoon: [] as number[], evening: [] as number[] }
  for (const r of reviews) {
    const hour = new Date(r.visitedAt).getHours()
    if (hour < 6) buckets.night.push(r.crowded)
    else if (hour < 12) buckets.morning.push(r.crowded)
    else if (hour < 18) buckets.afternoon.push(r.crowded)
    else buckets.evening.push(r.crowded)
  }
  const bucketStat = (vals: number[]) =>
    vals.length > 0
      ? { avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10, count: vals.length }
      : { avg: null, count: 0 }

  const crowdByPeriod = {
    night: bucketStat(buckets.night),
    morning: bucketStat(buckets.morning),
    afternoon: bucketStat(buckets.afternoon),
    evening: bucketStat(buckets.evening),
  }

  const periodsWithData = Object.values(crowdByPeriod).filter((p) => p.count > 0).length
  const crowdThresholdMet = count >= 3 && periodsWithData >= 2

  return NextResponse.json({
    ...bathroom,
    directionsSummary: bathroom.directionsSummary ?? null,
    avgOverall: avg("overall"),
    avgCleanliness: avg("cleanliness"),
    avgSmell: avg("smell"),
    avgSupplies: avg("supplies"),
    avgPrivacy: avg("privacy"),
    modeCost,
    crowdByPeriod,
    crowdThresholdMet,
  })
}
