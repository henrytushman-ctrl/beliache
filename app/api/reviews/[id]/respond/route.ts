import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { response } = await req.json()

  if (!response?.trim()) {
    return NextResponse.json({ error: "Response text required" }, { status: 400 })
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: { bathroom: { select: { claimedByUserId: true } } },
  })

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Only the bathroom owner can respond
  if (review.bathroom.claimedByUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden — not the bathroom owner" }, { status: 403 })
  }

  await prisma.review.update({
    where: { id },
    data: { ownerResponse: response.trim(), ownerResponseAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const review = await prisma.review.findUnique({
    where: { id },
    include: { bathroom: { select: { claimedByUserId: true } } },
  })

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (review.bathroom.claimedByUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.review.update({
    where: { id },
    data: { ownerResponse: null, ownerResponseAt: null },
  })

  return NextResponse.json({ ok: true })
}
