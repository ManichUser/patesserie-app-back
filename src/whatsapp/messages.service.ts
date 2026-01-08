// src/whatsapp/messages.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType, MessageDirection, MessageStatus } from 'src/generated/prisma/enums';

@Injectable()
export class MessagesService {
  private logger = new Logger(MessagesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Enregistrer un message
   */
  async saveMessage(data: {
    messageId: string;
    conversationId: string;
    contactJid: string;
    type: MessageType;
    content?: string;
    caption?: string;
    mediaUrl?: string;
    direction: MessageDirection;
    isFromMe: boolean;
    isAutoReply?: boolean;
    autoReplyId?: string;
    quotedMessageId?: string;
    timestamp?: Date;
  }) {
    // Trouver ou créer le contact
    let contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: data.contactJid },
    });

    if (!contact) {
      // Créer le contact
      const phone = data.contactJid.split('@')[0];
      contact = await this.prisma.whatsAppContact.create({
        data: {
          jid: data.contactJid,
          phone,
          firstMessageDate: new Date(),
          lastMessageDate: new Date(),
          messageCount: 1,
        },
      });
    }

    // Enregistrer le message
    return this.prisma.message.create({
      data: {
        messageId: data.messageId,
        conversationId: data.conversationId,
        contactId: contact.id,
        type: data.type,
        content: data.content,
        caption: data.caption,
        mediaUrl: data.mediaUrl,
        direction: data.direction,
        isFromMe: data.isFromMe,
        isAutoReply: data.isAutoReply || false,
        autoReplyId: data.autoReplyId,
        quotedMessageId: data.quotedMessageId,
        timestamp: data.timestamp || new Date(),
        status: MessageStatus.SENT,
      },
    });
  }

  /**
   * Récupérer l'historique d'une conversation
   */
  async getConversationHistory(contactJid: string, limit: number = 50) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: contactJid },
    });

    if (!contact) {
      return [];
    }

    return this.prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Rechercher dans les messages
   */
  async searchMessages(query: string, limit: number = 50) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { caption: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        contact: true,
      },
    });
  }

  /**
   * Obtenir les statistiques des messages
   */
  async getStats(filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where = {
      ...(filters?.startDate || filters?.endDate
        ? {
            timestamp: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const [total, byDirection, byType, autoReplies] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.groupBy({
        by: ['direction'],
        where,
        _count: true,
      }),
      this.prisma.message.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.message.count({
        where: { ...where, isAutoReply: true },
      }),
    ]);

    return {
      total,
      byDirection,
      byType,
      autoReplies,
    };
  }

  /**
   * Supprimer l'historique d'un contact
   */
  async deleteConversationHistory(contactJid: string) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: contactJid },
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    return this.prisma.message.deleteMany({
      where: { contactId: contact.id },
    });
  }
}