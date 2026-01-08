-- CreateTable
CREATE TABLE "whatsapp_groups" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "participantsCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_groups_jid_key" ON "whatsapp_groups"("jid");

-- CreateIndex
CREATE INDEX "whatsapp_groups_jid_idx" ON "whatsapp_groups"("jid");

-- CreateIndex
CREATE INDEX "whatsapp_groups_isActive_idx" ON "whatsapp_groups"("isActive");
