import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const review = await prisma.review.findUnique({ where: { id } })
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (review.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { cleanliness, supplies, smell, privacy, cost, crowded, notes, directions, overall, addPhotoUrls, removePhotoIds } = await req.json()

  await prisma.review.update({
    where: { id },
    data: {
      overall:     overall     ?? review.overall,
      cleanliness: cleanliness ?? review.cleanliness,
      supplies:    supplies    ?? review.supplies,
      smell:       smell       ?? review.smell,
      privacy:     privacy     ?? review.privacy,
      cost:        cost        ?? review.cost,
      crowded:     crowded     ?? review.crowded,
      notes:       notes       !== undefined ? (notes || null) : review.notes,
      directions:  directions  !== undefined ? (directions || null) : review.directions,
    },
  })

  // Remove photos the user deselected
  if (Array.isArray(removePhotoIds) && removePhotoIds.length > 0) {
    await prisma.photo.deleteMany({
      where: { id: { in: removePhotoIds }, userId: user.id },
    })
  }

  // Add new photos
  if (Array.isArray(addPhotoUrls) && addPhotoUrls.length > 0) {
    await prisma.photo.createMany({
      data: addPhotoUrls.map((url: string) => ({
        reviewId: id,
        userId: user.id,
        bathroomId: review.bathroomId,
        url,
      })),
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const review = await prisma.review.findUnique({ where: { id } })
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (review.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.review.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
