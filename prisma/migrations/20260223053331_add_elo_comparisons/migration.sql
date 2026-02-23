-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bathroomAId" TEXT NOT NULL,
    "bathroomBId" TEXT NOT NULL,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comparison_bathroomAId_fkey" FOREIGN KEY ("bathroomAId") REFERENCES "Bathroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comparison_bathroomBId_fkey" FOREIGN KEY ("bathroomBId") REFERENCES "Bathroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bathroom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "type" TEXT NOT NULL DEFAULT 'public',
    "addedById" TEXT NOT NULL,
    "directionsSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eloRating" REAL NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "comparisons" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Bathroom_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bathroom" ("addedById", "address", "createdAt", "directionsSummary", "id", "lat", "lng", "name", "type") SELECT "addedById", "address", "createdAt", "directionsSummary", "id", "lat", "lng", "name", "type" FROM "Bathroom";
DROP TABLE "Bathroom";
ALTER TABLE "new_Bathroom" RENAME TO "Bathroom";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Comparison_userId_createdAt_idx" ON "Comparison"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Comparison_bathroomAId_bathroomBId_idx" ON "Comparison"("bathroomAId", "bathroomBId");
