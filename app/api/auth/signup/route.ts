import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { name, username, email, password } = await req.json()

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })

    if (existing) {
      return NextResponse.json(
        { error: existing.email === email ? "Email already in use" : "Username taken" },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, username, email, password: hashed },
    })

    return NextResponse.json({ id: user.id, username: user.username })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
