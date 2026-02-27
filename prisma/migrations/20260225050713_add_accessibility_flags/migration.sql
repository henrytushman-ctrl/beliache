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
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "changingTable" BOOLEAN NOT NULL DEFAULT false,
    "genderNeutral" BOOLEAN NOT NULL DEFAULT false,
    "requiresKey" BOOLEAN NOT NULL DEFAULT false,
    "eloRating" REAL NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "comparisons" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Bathroom_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bathroom" ("addedById", "address", "comparisons", "createdAt", "directionsSummary", "eloRating", "id", "lat", "lng", "losses", "name", "ties", "type", "wins") SELECT "addedById", "address", "comparisons", "createdAt", "directionsSummary", "eloRating", "id", "lat", "lng", "losses", "name", "ties", "type", "wins" FROM "Bathroom";
DROP TABLE "Bathroom";
ALTER TABLE "new_Bathroom" RENAME TO "Bathroom";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
