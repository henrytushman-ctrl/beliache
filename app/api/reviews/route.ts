import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser } from "@/lib/auth-user"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bathroomId, overall, cleanliness, supplies, smell, privacy, notes, directions, cost, crowded } = await req.json()

  if (!bathroomId || overall == null) {
    return NextResponse.json({ error: "bathroomId and overall required" }, { status: 400 })
  }

  const userId = user.id

  const review = await prisma.review.create({
    data: {
      userId,
      bathroomId,
      overall,
      cleanliness: cleanliness ?? 3,
      supplies: supplies ?? 3,
      smell: smell ?? 3,
      privacy: privacy ?? 3,
      notes: notes ?? null,
      directions: directions ?? null,
      cost: cost ?? 0,
      crowded: crowded ?? 3,
    },
  })

  // Auto-add to user ranking at the bottom
  const existingRanking = await prisma.userRanking.findUnique({
    where: { userId_bathroomId: { userId, bathroomId } },
  })

  if (!existingRanking) {
    const maxRank = await prisma.userRanking.findFirst({
      where: { userId },
      orderBy: { position: "desc" },
    })
    const nextPosition = (maxRank?.position ?? 0) + 1
    await prisma.userRanking.create({
      data: { userId, bathroomId, position: nextPosition },
    })
  }

  // Regenerate AI directions summary if directions provided
  if (directions?.trim()) {
    const allDirections = await prisma.review.findMany({
      where: { bathroomId, directions: { not: null } },
      select: { directions: true },
    })

    const directionsList = allDirections
      .map((r, i) => `${i + 1}. ${r.directions}`)
      .join("\n")

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are helping people find a bathroom. Below are ${allDirections.length} user-submitted directions to the same bathroom. Synthesize them into one clear, concise set of directions (2–4 sentences). Only include navigation info — no opinions or ratings.\n\nDirections submitted:\n${directionsList}`,
      }],
    })

    const summary = message.content[0].type === "text" ? message.content[0].text : null
    if (summary) {
      await prisma.bathroom.update({
        where: { id: bathroomId },
        data: { directionsSummary: summary },
      })
    }
  }

  return NextResponse.json(review)
}
