import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""

  if (!q) return NextResponse.json([])

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        {
          OR: [
            { username: { contains: q } },
            { name: { contains: q } },
          ],
        },
      ],
    },
    select: { id: true, name: true, username: true, image: true },
    take: 10,
  })

  return NextResponse.json(users)
}
