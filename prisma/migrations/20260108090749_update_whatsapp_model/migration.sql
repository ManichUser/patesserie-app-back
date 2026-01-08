/*
  Warnings:

  - You are about to drop the column `recipients` on the `whatsapp_schedules` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('PRIVATE', 'GROUP');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'STATUS');

-- AlterTable
ALTER TABLE "whatsapp_schedules" DROP COLUMN "recipients",
ADD COLUMN     "type" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "whatsapp_recipients" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "type" "RecipientType" NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,

    CONSTRAINT "whatsapp_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_recipients_status_idx" ON "whatsapp_recipients"("status");

-- CreateIndex
CREATE INDEX "whatsapp_recipients_type_idx" ON "whatsapp_recipients"("type");

-- AddForeignKey
ALTER TABLE "whatsapp_recipients" ADD CONSTRAINT "whatsapp_recipients_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "whatsapp_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
