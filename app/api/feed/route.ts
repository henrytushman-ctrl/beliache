import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEMO_USER_ID = "demo0000000000000000000000"

export async function GET() {
  const userId = DEMO_USER_ID

  // Get accepted friends
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  })

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  )

  // Get recent reviews from friends + self
  const reviews = await prisma.review.findMany({
    where: { userId: { in: [...friendIds, userId] } },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      bathroom: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  // Get the user's ranking position for each bathroom in the feed
  const bathroomIds = [...new Set(reviews.map((r) => r.bathroomId))]
  const myRankings = await prisma.userRanking.findMany({
    where: { userId, bathroomId: { in: bathroomIds } },
  })
  const rankMap = Object.fromEntries(myRankings.map((r) => [r.bathroomId, r.position]))

  const feedItems = reviews.map((r) => ({
    ...r,
    myRank: rankMap[r.bathroomId] ?? null,
  }))

  return NextResponse.json(feedItems)
}
