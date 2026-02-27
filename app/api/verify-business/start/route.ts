import { NextRequest, NextResponse } from "next/server"
import { getOrCreateUser } from "@/lib/auth-user"

// Scopes needed: openid + Google Business Profile management
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/business.manage",
].join(" ")

export async function GET(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  const { searchParams, origin } = new URL(req.url)
  const bathroomId = searchParams.get("bathroomId")
  if (!bathroomId) {
    return NextResponse.json({ error: "bathroomId required" }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/bathroom/${bathroomId}?claim=not_configured`, req.url)
    )
  }

  const redirectUri = `${origin}/api/verify-business/callback`

  // State encodes bathroomId + userId so the callback knows who initiated
  const state = Buffer.from(JSON.stringify({ bathroomId, userId: user.id })).toString("base64url")

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
