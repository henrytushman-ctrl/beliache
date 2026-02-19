-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bathroomId" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "cleanliness" INTEGER NOT NULL,
    "supplies" INTEGER NOT NULL,
    "smell" INTEGER NOT NULL,
    "privacy" INTEGER NOT NULL,
    "notes" TEXT,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "crowded" INTEGER NOT NULL DEFAULT 3,
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_bathroomId_fkey" FOREIGN KEY ("bathroomId") REFERENCES "Bathroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("bathroomId", "cleanliness", "createdAt", "id", "notes", "overall", "privacy", "smell", "supplies", "userId", "visitedAt") SELECT "bathroomId", "cleanliness", "createdAt", "id", "notes", "overall", "privacy", "smell", "supplies", "userId", "visitedAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
