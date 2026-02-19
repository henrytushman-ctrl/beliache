import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  const session = await auth()
  const targetId = userId || session?.user.id
  if (!targetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rankings = await prisma.userRanking.findMany({
    where: { userId: targetId },
    orderBy: { position: "asc" },
    include: {
      bathroom: {
        include: {
          reviews: {
            where: { userId: targetId },
            select: { overall: true, cleanliness: true, smell: true, supplies: true, privacy: true, notes: true, visitedAt: true },
          },
        },
      },
    },
  })

  return NextResponse.json(rankings)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { order } = await req.json() as { order: string[] }

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order must be an array of bathroomIds" }, { status: 400 })
  }

  const userId = session.user.id

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
