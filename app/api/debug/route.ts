import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) + "..." : "MISSING",
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "SET (" + process.env.TURSO_AUTH_TOKEN.length + " chars)" : "MISSING",
  })
}
