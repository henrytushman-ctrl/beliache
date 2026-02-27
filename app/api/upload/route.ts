import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getOrCreateUser } from "@/lib/auth-user"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"]

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or HEIC images allowed" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const filename = `bathrooms/${user.id}/${Date.now()}.${ext}`

  const blob = await put(filename, file, { access: "public" })

  return NextResponse.json({ url: blob.url })
}
