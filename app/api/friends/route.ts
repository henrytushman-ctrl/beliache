import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  image: true,
  _count: { select: { reviews: true } },
} as const

export async function GET() {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = user.id

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: USER_SELECT },
      addressee: { select: USER_SELECT },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(friendships)
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { addresseeId } = await req.json()
  const requesterId = user.id

  if (requesterId === addresseeId) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 })
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  })

  if (existing) return NextResponse.json(existing)

  const friendship = await prisma.friendship.create({
    data: { requesterId, addresseeId, status: "pending" },
  })

  return NextResponse.json(friendship)
}

export async function PATCH(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { friendshipId, action } = await req.json()

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.addresseeId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: action === "accept" ? "accepted" : "declined" },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { friendshipId } = await req.json()

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.friendship.delete({ where: { id: friendshipId } })
  return NextResponse.json({ ok: true })
}
