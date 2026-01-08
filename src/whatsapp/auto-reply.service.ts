// src/whatsapp/auto-reply.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchType } from 'src/generated/prisma/enums';

@Injectable()
export class AutoReplyService {
  private logger = new Logger(AutoReplyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Créer une réponse automatique
   */
  async createAutoReply(data: {
    keyword: string;
    response: string;
    matchType?: MatchType;
    priority?: number;
    isActive?: boolean;
  }) {
    return this.prisma.autoReply.create({
      data: {
        keyword: data.keyword.toLowerCase().trim(),
        response: data.response,
        matchType: data.matchType || MatchType.CONTAINS,
        priority: data.priority || 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Récupérer toutes les réponses automatiques
   */
  async getAllAutoReplies(filters?: {
    isActive?: boolean;
    search?: string;
  }) {
    return this.prisma.autoReply.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.search && {
          OR: [
            { keyword: { contains: filters.search, mode: 'insensitive' } },
            { response: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [
        { priority: 'desc' },
        { keyword: 'asc' },
      ],
    });
  }

  /**
   * Récupérer une réponse automatique par ID
   */
  async getAutoReplyById(id: string) {
    return this.prisma.autoReply.findUnique({
      where: { id },
    });
  }

  /**
   * Mettre à jour une réponse automatique
   */
  async updateAutoReply(
    id: string,
    data: {
      keyword?: string;
      response?: string;
      matchType?: MatchType;
      priority?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.autoReply.update({
      where: { id },
      data: {
        ...(data.keyword && { keyword: data.keyword.toLowerCase().trim() }),
        ...(data.response && { response: data.response }),
        ...(data.matchType && { matchType: data.matchType }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Supprimer une réponse automatique
   */
  async deleteAutoReply(id: string) {
    return this.prisma.autoReply.delete({
      where: { id },
    });
  }

  /**
   * Basculer l'état actif/inactif
   */
  async toggleAutoReply(id: string) {
    const autoReply = await this.prisma.autoReply.findUnique({
      where: { id },
    });

    if (!autoReply) {
      throw new Error('Réponse automatique non trouvée');
    }

    return this.prisma.autoReply.update({
      where: { id },
      data: { isActive: !autoReply.isActive },
    });
  }

  /**
   * Trouver une réponse pour un message donné
   */
  async findMatchingReply(messageText: string): Promise<string | null> {
    const normalizedMessage = messageText.toLowerCase().trim();

    // Récupérer toutes les réponses actives
    const replies = await this.prisma.autoReply.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    // Chercher une correspondance
    for (const reply of replies) {
      const normalizedKeyword = reply.keyword.toLowerCase();

      let isMatch = false;

      switch (reply.matchType) {
        case MatchType.EXACT:
          isMatch = normalizedMessage === normalizedKeyword;
          break;

        case MatchType.CONTAINS:
          isMatch = normalizedMessage.includes(normalizedKeyword);
          break;

        case MatchType.STARTS_WITH:
          isMatch = normalizedMessage.startsWith(normalizedKeyword);
          break;

        case MatchType.ENDS_WITH:
          isMatch = normalizedMessage.endsWith(normalizedKeyword);
          break;

        case MatchType.REGEX:
          try {
            const regex = new RegExp(normalizedKeyword, 'i');
            isMatch = regex.test(normalizedMessage);
          } catch (error) {
            this.logger.error(`Regex invalide pour "${reply.keyword}":`, error);
          }
          break;
      }

      if (isMatch) {
        // Incrémenter le compteur d'utilisation
        await this.prisma.autoReply.update({
          where: { id: reply.id },
          data: { usageCount: { increment: 1 } },
        });

        this.logger.log(`✅ Réponse trouvée pour "${messageText}" → "${reply.keyword}"`);
        return reply.response;
      }
    }

    this.logger.debug(`ℹ️ Aucune réponse automatique pour: "${messageText}"`);
    return null;
  }

  /**
   * Obtenir les statistiques
   */
  async getStats() {
    const [total, active, inactive, mostUsed] = await Promise.all([
      this.prisma.autoReply.count(),
      this.prisma.autoReply.count({ where: { isActive: true } }),
      this.prisma.autoReply.count({ where: { isActive: false } }),
      this.prisma.autoReply.findMany({
        orderBy: { usageCount: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total,
      active,
      inactive,
      mostUsed,
    };
  }
}