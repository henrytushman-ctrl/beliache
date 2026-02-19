import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEMO_USER_ID = "demo0000000000000000000000"

export async function GET() {
  const userId = DEMO_USER_ID

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, username: true, image: true } },
      addressee: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  return NextResponse.json(friendships)
}

export async function POST(req: NextRequest) {
  const { addresseeId } = await req.json()
  const requesterId = DEMO_USER_ID

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
  const { friendshipId, action } = await req.json()

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.addresseeId !== DEMO_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: action === "accept" ? "accepted" : "declined" },
  })

  return NextResponse.json(updated)
}
