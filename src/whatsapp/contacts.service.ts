// src/whatsapp/contacts.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerSegment } from 'src/generated/prisma/enums';

@Injectable()
export class WhatsAppContactsService {
  private logger = new Logger(WhatsAppContactsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Créer ou mettre à jour un contact
   */
  async upsertContact(data: {
    jid: string;
    name?: string;
    phone: string;
    pushName?: string;
  }) {
    const existingContact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: data.jid },
    });

    if (existingContact) {
      // Mettre à jour
      return this.prisma.whatsAppContact.update({
        where: { jid: data.jid },
        data: {
          name: data.name || existingContact.name,
          pushName: data.pushName || existingContact.pushName,
          lastMessageDate: new Date(),
          messageCount: { increment: 1 },
        },
      });
    } else {
      // Créer
      return this.prisma.whatsAppContact.create({
        data: {
          jid: data.jid,
          name: data.name,
          phone: data.phone,
          pushName: data.pushName,
          firstMessageDate: new Date(),
          lastMessageDate: new Date(),
          messageCount: 1,
          segment: CustomerSegment.PROSPECT,
        },
      });
    }
  }

  /**
   * Récupérer un contact par JID
   */
  async getContactByJid(jid: string) {
    return this.prisma.whatsAppContact.findUnique({
      where: { jid },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Récupérer tous les contacts
   */
  async getAllContacts(filters?: {
    segment?: CustomerSegment;
    tags?: string[];
    search?: string;
    isBlocked?: boolean;
    isFavorite?: boolean;
  }) {
    return this.prisma.whatsAppContact.findMany({
      where: {
        ...(filters?.segment && { segment: filters.segment }),
        ...(filters?.tags && { tags: { hasSome: filters.tags } }),
        ...(filters?.isBlocked !== undefined && { isBlocked: filters.isBlocked }),
        ...(filters?.isFavorite !== undefined && { isFavorite: filters.isFavorite }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
            { pushName: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { lastMessageDate: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Mettre à jour un contact
   */
  async updateContact(jid: string, data: {
    name?: string;
    tags?: string[];
    notes?: string;
    segment?: CustomerSegment;
    isFavorite?: boolean;
    isBlocked?: boolean;
  }) {
    return this.prisma.whatsAppContact.update({
      where: { jid },
      data,
    });
  }

  /**
   * Ajouter des tags à un contact
   */
  async addTags(jid: string, tags: string[]) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid },
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    const newTags = [...new Set([...contact.tags, ...tags])];

    return this.prisma.whatsAppContact.update({
      where: { jid },
      data: { tags: newTags },
    });
  }

  /**
   * Supprimer des tags
   */
  async removeTags(jid: string, tags: string[]) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid },
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    const newTags = contact.tags.filter(t => !tags.includes(t));

    return this.prisma.whatsAppContact.update({
      where: { jid },
      data: { tags: newTags },
    });
  }

  /**
   * Mettre à jour les données de commande
   */
  async updateOrderData(jid: string, data: {
    totalOrders?: number;
    totalSpent?: number;
    lastOrderDate?: Date;
  }) {
    return this.prisma.whatsAppContact.update({
      where: { jid },
      data,
    });
  }

  /**
   * Recalculer le segment d'un contact
   */
  async recalculateSegment(jid: string) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid },
    });

    if (!contact) return;

    let newSegment: CustomerSegment = CustomerSegment.PROSPECT; // ✅ Type explicite

    // Logique de segmentation
    if (contact.isBlocked) {
      newSegment = CustomerSegment.BLOCKED;
    } else if (contact.totalOrders === 0) {
      newSegment = CustomerSegment.PROSPECT;
    } else if (contact.totalOrders === 1) {
      newSegment = CustomerSegment.NEW;
    } else if (contact.totalOrders >= 5 || contact.totalSpent >= 50000) {
      newSegment = CustomerSegment.VIP;
    } else if (contact.totalOrders >= 2) {
      // Vérifier l'inactivité
      const daysSinceLastOrder = contact.lastOrderDate
        ? Math.floor((Date.now() - contact.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastOrder > 30) {
        newSegment = CustomerSegment.INACTIVE;
      } else {
        newSegment = CustomerSegment.REGULAR;
      }
    }

    if (newSegment !== contact.segment) {
      await this.prisma.whatsAppContact.update({
        where: { jid },
        data: { segment: newSegment },
      });

      this.logger.log(`📊 Segment mis à jour pour ${jid}: ${contact.segment} → ${newSegment}`);
    }

    return newSegment;
  }

  /**
   * Obtenir les statistiques globales
   */
  async getStats() {
    const [total, bySegment, favorites, blocked, withOrders] = await Promise.all([
      this.prisma.whatsAppContact.count(),
      this.prisma.whatsAppContact.groupBy({
        by: ['segment'],
        _count: true,
      }),
      this.prisma.whatsAppContact.count({ where: { isFavorite: true } }),
      this.prisma.whatsAppContact.count({ where: { isBlocked: true } }),
      this.prisma.whatsAppContact.count({ where: { totalOrders: { gt: 0 } } }),
    ]);

    return {
      total,
      bySegment,
      favorites,
      blocked,
      withOrders,
      prospects: total - withOrders,
    };
  }
}