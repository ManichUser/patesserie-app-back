-- CreateEnum
CREATE TYPE "FollowUpTrigger" AS ENUM ('AFTER_ORDER', 'AFTER_PAYMENT', 'AFTER_DELIVERY', 'AFTER_FIRST_MESSAGE', 'AFTER_LAST_MESSAGE', 'INACTIVITY', 'BIRTHDAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'POLL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('PROSPECT', 'NEW', 'REGULAR', 'VIP', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "pushName" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastOrderDate" TIMESTAMP(3),
    "firstMessageDate" TIMESTAMP(3),
    "lastMessageDate" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "segment" "CustomerSegment" NOT NULL DEFAULT 'PROSPECT',
    "source" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "content" TEXT,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "mediaSize" INTEGER,
    "mediaMimeType" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "isFromMe" BOOLEAN NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "isAutoReply" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyId" TEXT,
    "quotedMessageId" TEXT,
    "isForwarded" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "FollowUpTrigger" NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "WhatsAppMessageType",
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_jid_key" ON "whatsapp_contacts"("jid");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_jid_idx" ON "whatsapp_contacts"("jid");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_phone_idx" ON "whatsapp_contacts"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_segment_idx" ON "whatsapp_contacts"("segment");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_lastMessageDate_idx" ON "whatsapp_contacts"("lastMessageDate");

-- CreateIndex
CREATE UNIQUE INDEX "messages_messageId_key" ON "messages"("messageId");

-- CreateIndex
CREATE INDEX "messages_contactId_idx" ON "messages"("contactId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "messages"("timestamp");

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- CreateIndex
CREATE INDEX "messages_isAutoReply_idx" ON "messages"("isAutoReply");

-- CreateIndex
CREATE INDEX "follow_up_templates_trigger_idx" ON "follow_up_templates"("trigger");

-- CreateIndex
CREATE INDEX "follow_up_templates_isActive_idx" ON "follow_up_templates"("isActive");

-- CreateIndex
CREATE INDEX "follow_ups_contactId_idx" ON "follow_ups"("contactId");

-- CreateIndex
CREATE INDEX "follow_ups_templateId_idx" ON "follow_ups"("templateId");

-- CreateIndex
CREATE INDEX "follow_ups_scheduledAt_status_idx" ON "follow_ups"("scheduledAt", "status");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "follow_up_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
