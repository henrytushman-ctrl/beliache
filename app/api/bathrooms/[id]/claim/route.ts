import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const bathroom = await prisma.bathroom.findUnique({ where: { id } })
  if (!bathroom) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (bathroom.claimedByUserId) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 })
  }

  const updated = await prisma.bathroom.update({
    where: { id },
    data: {
      claimedByUserId: user.id,
      claimedAt: new Date(),
      verified: true,
    },
  })

  return NextResponse.json({ ok: true, verified: updated.verified })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const bathroom = await prisma.bathroom.findUnique({ where: { id } })
  if (!bathroom) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (bathroom.claimedByUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.bathroom.update({
    where: { id },
    data: { claimedByUserId: null, claimedAt: null, verified: false },
  })

  return NextResponse.json({ ok: true })
}
