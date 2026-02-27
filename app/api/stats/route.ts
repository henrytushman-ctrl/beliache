import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

export async function GET() {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // 1. How many distinct bathrooms the user has reviewed
  const visited = await prisma.review.findMany({
    where: { userId: user.id },
    select: { bathroomId: true },
    distinct: ["bathroomId"],
  })
  const totalVisited = visited.length

  // 2. Most popular bathrooms in the last 30 days (global)
  const popularRaw = await prisma.review.groupBy({
    by: ["bathroomId"],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: { bathroomId: true },
    orderBy: { _count: { bathroomId: "desc" } },
    take: 3,
  })

  const popularDetails =
    popularRaw.length > 0
      ? await prisma.bathroom.findMany({
          where: { id: { in: popularRaw.map((r) => r.bathroomId) } },
          select: { id: true, name: true, address: true },
        })
      : []

  const mostPopularRecently = popularRaw
    .map((r) => ({
      ...popularDetails.find((b) => b.id === r.bathroomId)!,
      reviewCount: r._count.bathroomId,
    }))
    .filter((b) => b.id)

  // 3. Worst bathrooms in the last 30 days (global, avg overall score)
  const worstRaw = await prisma.review.groupBy({
    by: ["bathroomId"],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _avg: { overall: true },
    orderBy: { _avg: { overall: "asc" } },
    take: 3,
  })

  const worstDetails =
    worstRaw.length > 0
      ? await prisma.bathroom.findMany({
          where: { id: { in: worstRaw.map((r) => r.bathroomId) } },
          select: { id: true, name: true, address: true },
        })
      : []

  const worstRecently = worstRaw
    .map((r) => ({
      ...worstDetails.find((b) => b.id === r.bathroomId)!,
      avgScore:
        r._avg.overall !== null ? Math.round(r._avg.overall * 10) / 10 : null,
    }))
    .filter((b) => b.id)

  // 4. Top BeliAchers — users with the most distinct bathrooms visited
  const topUsersRaw = await prisma.review.groupBy({
    by: ["userId"],
    _count: { bathroomId: true },
    orderBy: { _count: { bathroomId: "desc" } },
    take: 5,
  })

  const topUserDetails =
    topUsersRaw.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topUsersRaw.map((r) => r.userId) } },
          select: { id: true, name: true, username: true },
        })
      : []

  const topBeliAchers = topUsersRaw
    .map((r) => ({
      ...topUserDetails.find((u) => u.id === r.userId)!,
      bathroomsVisited: r._count.bathroomId,
      isYou: r.userId === user.id,
    }))
    .filter((u) => u.id)

  return NextResponse.json({
    totalVisited,
    mostPopularRecently,
    worstRecently,
    topBeliAchers,
  })
}
