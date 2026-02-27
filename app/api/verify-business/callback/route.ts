import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()
}

// Returns true if the Google Business location title is a reasonable match
// for the bathroom name we have stored
function nameMatches(bathroomName: string, locationTitle: string): boolean {
  const bn = normalize(bathroomName)
  const lt = normalize(locationTitle)
  if (!bn || !lt) return false
  // Direct containment
  if (bn.includes(lt) || lt.includes(bn)) return true
  // Shared significant words (>3 chars)
  const bnWords = new Set(bn.split(/\s+/).filter((w) => w.length > 3))
  const ltWords = lt.split(/\s+/).filter((w) => w.length > 3)
  const shared = ltWords.filter((w) => bnWords.has(w))
  return shared.length >= 2
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const rawState = searchParams.get("state") || ""
  const oauthError = searchParams.get("error")

  let bathroomId = ""
  let userId = ""

  try {
    const decoded = JSON.parse(Buffer.from(rawState, "base64url").toString())
    bathroomId = decoded.bathroomId
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(new URL("/discover?claim=error", req.url))
  }

  const redirect = (status: string) =>
    NextResponse.redirect(new URL(`/bathroom/${bathroomId}?claim=${status}`, req.url))

  if (oauthError || !code) return redirect("cancelled")

  try {
    // ── 1. Exchange code for access token ───────────────────────────────────
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/verify-business/callback`,
        grant_type: "authorization_code",
      }),
    })
    if (!tokenRes.ok) throw new Error("Token exchange failed")
    const { access_token } = await tokenRes.json()

    // ── 2. Check bathroom ───────────────────────────────────────────────────
    const bathroom = await prisma.bathroom.findUnique({
      where: { id: bathroomId },
      select: { name: true, claimedByUserId: true },
    })
    if (!bathroom) return redirect("error")
    if (bathroom.claimedByUserId && bathroom.claimedByUserId !== userId) {
      return redirect("taken")
    }

    // ── 3. Fetch Google Business accounts ───────────────────────────────────
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    if (!accountsRes.ok) throw new Error("Failed to fetch accounts")
    const { accounts } = await accountsRes.json() as { accounts?: { name: string }[] }

    if (!accounts?.length) return redirect("no_business")

    // ── 4. Search locations across all accounts for a name match ────────────
    let matched = false
    for (const account of accounts) {
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=title`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      )
      if (!locRes.ok) continue
      const { locations } = await locRes.json() as { locations?: { title?: string }[] }
      if (!locations?.length) continue

      for (const loc of locations) {
        if (nameMatches(bathroom.name, loc.title ?? "")) {
          matched = true
          break
        }
      }
      if (matched) break
    }

    if (!matched) return redirect("no_match")

    // ── 5. Mark verified ────────────────────────────────────────────────────
    await prisma.bathroom.update({
      where: { id: bathroomId },
      data: { claimedByUserId: userId, claimedAt: new Date(), verified: true },
    })

    return redirect("verified")
  } catch (e) {
    console.error("Business verification error:", e)
    return redirect("error")
  }
}
