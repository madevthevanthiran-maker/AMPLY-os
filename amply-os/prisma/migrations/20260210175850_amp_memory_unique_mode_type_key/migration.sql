/*
  Warnings:

  - Made the column `mode` on table `AmpMemory` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AmpMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 60,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME
);
INSERT INTO "new_AmpMemory" ("confidence", "createdAt", "id", "key", "lastUsedAt", "mode", "pinned", "type", "updatedAt", "value") SELECT "confidence", "createdAt", "id", "key", "lastUsedAt", "mode", "pinned", "type", "updatedAt", "value" FROM "AmpMemory";
DROP TABLE "AmpMemory";
ALTER TABLE "new_AmpMemory" RENAME TO "AmpMemory";
CREATE INDEX "AmpMemory_updatedAt_idx" ON "AmpMemory"("updatedAt");
CREATE INDEX "AmpMemory_lastUsedAt_idx" ON "AmpMemory"("lastUsedAt");
CREATE INDEX "AmpMemory_pinned_idx" ON "AmpMemory"("pinned");
CREATE INDEX "AmpMemory_mode_idx" ON "AmpMemory"("mode");
CREATE INDEX "AmpMemory_type_idx" ON "AmpMemory"("type");
CREATE UNIQUE INDEX "AmpMemory_mode_type_key_key" ON "AmpMemory"("mode", "type", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
