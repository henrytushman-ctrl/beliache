import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({ ok: true, userCount: count })
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; meta?: unknown }
    return NextResponse.json({ ok: false, message: err.message, code: err.code, meta: err.meta })
  }
}
