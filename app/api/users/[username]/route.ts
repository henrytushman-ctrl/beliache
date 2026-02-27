import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeBadges } from "@/lib/badges"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
      _count: { select: { reviews: true } },
    },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    select: { overall: true },
  })

  const avgScore =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.overall, 0) / reviews.length) * 10) / 10
      : null

  const rankings = await prisma.userRanking.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
    include: {
      bathroom: {
        include: {
          reviews: {
            where: { userId: user.id },
            select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true },
          },
        },
      },
    },
  })

  const badges = await computeBadges(user.id)

  return NextResponse.json({ ...user, avgScore, rankings, badges })
}
