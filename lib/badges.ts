import { prisma } from "@/lib/prisma"

export type Badge = {
  id: string
  name: string
  emoji: string
  description: string
}

function parseCity(address: string): string | null {
  const parts = address.split(", ")
  return parts.length >= 3 ? parts[1] : null
}

export async function computeBadges(userId: string): Promise<Badge[]> {
  const earned: Badge[] = []

  const reviews = await prisma.review.findMany({
    where: { userId },
    include: {
      photos: { select: { id: true } },
      bathroom: { select: { id: true, city: true, address: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const count = reviews.length

  // ── Milestone badges ────────────────────────────────────────────
  if (count >= 1)
    earned.push({ id: "first_flush", emoji: "🚽", name: "First Flush", description: "Submitted your first review" })
  if (count >= 5)
    earned.push({ id: "regular", emoji: "🧻", name: "Regular", description: "Reviewed 5 bathrooms" })
  if (count >= 10)
    earned.push({ id: "plunger", emoji: "🪠", name: "Plunger", description: "Reviewed 10 bathrooms" })
  if (count >= 25)
    earned.push({ id: "stall_whisperer", emoji: "🚿", name: "Stall Whisperer", description: "Reviewed 25 bathrooms" })
  if (count >= 50)
    earned.push({ id: "legend", emoji: "👑", name: "BeliAche Legend", description: "Reviewed 50 bathrooms" })

  // ── Photo badge ─────────────────────────────────────────────────
  const withPhotos = reviews.filter((r) => r.photos.length > 0).length
  if (withPhotos >= 3)
    earned.push({ id: "paparazzi", emoji: "📸", name: "Paparazzi", description: "Added photos to 3+ reviews" })

  // ── Time badge ──────────────────────────────────────────────────
  const nightReview = reviews.find((r) => {
    const hour = new Date(r.visitedAt).getHours()
    return hour >= 0 && hour < 5
  })
  if (nightReview)
    earned.push({ id: "night_owl", emoji: "🦉", name: "Night Owl", description: "Reviewed a bathroom between midnight and 5am" })

  // ── City / travel badge ─────────────────────────────────────────
  const cities = new Set(
    reviews.map((r) => r.bathroom.city ?? parseCity(r.bathroom.address)).filter(Boolean)
  )
  if (cities.size >= 3)
    earned.push({ id: "traveler", emoji: "🌍", name: "World Traveler", description: "Reviewed bathrooms in 3+ cities" })

  // ── Cost badge ──────────────────────────────────────────────────
  const freeBathrooms = reviews.filter((r) => r.cost === 0).length
  if (freeBathrooms >= 3)
    earned.push({ id: "frugal", emoji: "💸", name: "Frugal Flusher", description: "Found 3+ free bathrooms" })

  // ── Quality badges ──────────────────────────────────────────────
  if (reviews.some((r) => r.cleanliness === 5))
    earned.push({ id: "pristine", emoji: "✨", name: "Pristine Finder", description: "Found a perfectly clean bathroom" })
  if (reviews.some((r) => r.privacy === 5))
    earned.push({ id: "private_eye", emoji: "🕵️", name: "Private Eye", description: "Found a perfectly private bathroom" })
  if (reviews.some((r) => r.smell === 5))
    earned.push({ id: "nose_knows", emoji: "🌸", name: "Nose Knows", description: "Found a bathroom that actually smells good" })

  // ── OG reviewer badge ───────────────────────────────────────────
  const bathroomIds = reviews.map((r) => r.bathroom.id)
  if (bathroomIds.length > 0) {
    // For each bathroom this user reviewed, check if they were first
    const firstReviews = await prisma.review.findMany({
      where: { bathroomId: { in: bathroomIds } },
      orderBy: { createdAt: "asc" },
      distinct: ["bathroomId"],
      select: { bathroomId: true, userId: true },
    })
    const isOG = firstReviews.some((r) => r.userId === userId)
    if (isOG)
      earned.push({ id: "og", emoji: "🥇", name: "OG", description: "First to review a bathroom" })
  }

  // ── Critic badge (low score) ────────────────────────────────────
  if (reviews.some((r) => r.overall <= 2))
    earned.push({ id: "critic", emoji: "💩", name: "Harsh Critic", description: "Gave a brutal 2/10 or lower review" })

  return earned
}
