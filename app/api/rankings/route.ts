import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

export async function GET(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get("userId") || user.id

  const rankings = await prisma.userRanking.findMany({
    where: { userId: targetId },
    orderBy: { position: "asc" },
    include: {
      bathroom: {
        include: {
          reviews: {
            where: { userId: targetId },
            select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true, crowded: true, notes: true, visitedAt: true },
          },
        },
      },
    },
  })

  return NextResponse.json(rankings)
}

export async function PUT(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { order } = await req.json() as { order: string[] }

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order must be an array of bathroomIds" }, { status: 400 })
  }

  const userId = user.id

  // Update positions in a transaction
  await prisma.$transaction(
    order.map((bathroomId, idx) =>
      prisma.userRanking.update({
        where: { userId_bathroomId: { userId, bathroomId } },
        data: { position: idx + 1 },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
