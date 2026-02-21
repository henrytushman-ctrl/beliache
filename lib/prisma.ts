import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrisma() {
  const url = (process.env.DATABASE_URL ?? "file:./dev.db").trim()
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()
  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
