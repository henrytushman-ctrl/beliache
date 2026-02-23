import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

/**
 * Returns the current authenticated user's DB record, creating it on first sign-in.
 * Returns null if the request is unauthenticated.
 */
export async function getOrCreateUser() {
  const { userId } = await auth()
  if (!userId) return null

  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (existing) return existing

  // First time — fetch Clerk profile and create DB record
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@clerk.local`
  const name = clerkUser?.fullName ?? clerkUser?.firstName ?? "User"
  const image = clerkUser?.imageUrl ?? null

  // Build a unique username from email prefix
  const base = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase() || "user"
  let username = base
  let i = 1
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${i++}`
  }

  return prisma.user.create({
    data: { id: userId, email, name, username, image },
  })
}
