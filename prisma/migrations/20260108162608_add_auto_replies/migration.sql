-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX');

-- CreateTable
CREATE TABLE "auto_replies" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchType" "MatchType" NOT NULL DEFAULT 'CONTAINS',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auto_replies_keyword_key" ON "auto_replies"("keyword");

-- CreateIndex
CREATE INDEX "auto_replies_keyword_idx" ON "auto_replies"("keyword");

-- CreateIndex
CREATE INDEX "auto_replies_isActive_idx" ON "auto_replies"("isActive");
