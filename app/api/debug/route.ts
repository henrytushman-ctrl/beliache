import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({ ok: true, userCount: count })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
