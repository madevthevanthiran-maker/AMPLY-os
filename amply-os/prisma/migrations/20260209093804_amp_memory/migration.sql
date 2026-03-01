-- CreateTable
CREATE TABLE "AmpMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "mode" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 60,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "AmpMemory_updatedAt_idx" ON "AmpMemory"("updatedAt");

-- CreateIndex
CREATE INDEX "AmpMemory_lastUsedAt_idx" ON "AmpMemory"("lastUsedAt");

-- CreateIndex
CREATE INDEX "AmpMemory_pinned_idx" ON "AmpMemory"("pinned");

-- CreateIndex
CREATE UNIQUE INDEX "AmpMemory_type_key_value_key" ON "AmpMemory"("type", "key", "value");
