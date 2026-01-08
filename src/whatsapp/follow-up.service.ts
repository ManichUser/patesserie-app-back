// src/whatsapp/follow-up.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  FollowUpTrigger, 
  FollowUpStatus, 
  WhatsAppMessageType 
} from 'src/generated/prisma/enums';

@Injectable()
export class FollowUpService {
  private logger = new Logger(FollowUpService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Créer un template de suivi
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    trigger: FollowUpTrigger;
    delayDays?: number;
    delayHours?: number;
    delayMinutes?: number;
    message: string;
    mediaUrl?: string;
    mediaType?: WhatsAppMessageType;
    conditions?: any;
    priority?: number;
    isActive?: boolean;
  }) {
    return this.prisma.followUpTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        delayDays: data.delayDays || 0,
        delayHours: data.delayHours || 0,
        delayMinutes: data.delayMinutes || 0,
        message: data.message,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        conditions: data.conditions,
        priority: data.priority || 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Récupérer tous les templates
   */
  async getAllTemplates(filters?: {
    trigger?: FollowUpTrigger;
    isActive?: boolean;
  }) {
    return this.prisma.followUpTemplate.findMany({
      where: {
        ...(filters?.trigger && { trigger: filters.trigger }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Récupérer un template par ID
   */
  async getTemplateById(id: string) {
    return this.prisma.followUpTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Mettre à jour un template
   */
  async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      trigger?: FollowUpTrigger;
      delayDays?: number;
      delayHours?: number;
      delayMinutes?: number;
      message?: string;
      mediaUrl?: string;
      mediaType?: WhatsAppMessageType;
      conditions?: any;
      priority?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.followUpTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprimer un template
   */
  async deleteTemplate(id: string) {
    return this.prisma.followUpTemplate.delete({
      where: { id },
    });
  }

  /**
   * Activer/Désactiver un template
   */
  async toggleTemplate(id: string) {
    const template = await this.prisma.followUpTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template non trouvé');
    }

    return this.prisma.followUpTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
  }

  /**
   * Programmer un suivi pour un contact
   */
  async scheduleFollowUp(data: {
    contactJid: string;
    templateId: string;
    scheduledAt?: Date; // Optionnel, calculé automatiquement si non fourni
    metadata?: any;
  }) {
    // Récupérer le contact
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: data.contactJid },
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    // Récupérer le template
    const template = await this.prisma.followUpTemplate.findUnique({
      where: { id: data.templateId },
    });

    if (!template) {
      throw new Error('Template non trouvé');
    }

    if (!template.isActive) {
      throw new Error('Template inactif');
    }

    // Calculer la date d'envoi si non fournie
    let scheduledAt = data.scheduledAt;

    if (!scheduledAt) {
      const now = new Date();
      const delayMs =
        template.delayDays * 24 * 60 * 60 * 1000 +
        template.delayHours * 60 * 60 * 1000 +
        template.delayMinutes * 60 * 1000;

      scheduledAt = new Date(now.getTime() + delayMs);
    }

    // Créer le suivi
    return this.prisma.followUp.create({
      data: {
        contactId: contact.id,
        templateId: template.id,
        scheduledAt,
        status: FollowUpStatus.PENDING,
        metadata: data.metadata,
      },
      include: {
        template: true,
        contact: true,
      },
    });
  }

  /**
   * Programmer automatiquement les suivis selon un déclencheur
   */
  async scheduleByTrigger(data: {
    contactJid: string;
    trigger: FollowUpTrigger;
    metadata?: any;
  }) {
    // Récupérer tous les templates actifs pour ce déclencheur
    const templates = await this.prisma.followUpTemplate.findMany({
      where: {
        trigger: data.trigger,
        isActive: true,
      },
    });

    const results = [];

    for (const template of templates) {
      try {
        const followUp = await this.scheduleFollowUp({
          contactJid: data.contactJid,
          templateId: template.id,
          metadata: data.metadata,
        });

        results.push({ success: true, followUp });

        this.logger.log(
          `✅ Suivi programmé: ${template.name} pour ${data.contactJid} à ${followUp.scheduledAt.toISOString()}`,
        );
      } catch (error) {
        results.push({
          success: false,
          template: template.name,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });

        this.logger.error(
          `❌ Erreur programmation suivi ${template.name}:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Récupérer les suivis à envoyer maintenant
   */
  async getFollowUpsToSend() {
    const now = new Date();

    return this.prisma.followUp.findMany({
      where: {
        status: FollowUpStatus.PENDING,
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        template: true,
        contact: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }

  /**
   * Marquer un suivi comme envoyé
   */
  async markAsSent(id: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  /**
   * Marquer un suivi comme échoué
   */
  async markAsFailed(id: string, error: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.FAILED,
        error,
      },
    });
  }

  /**
   * Annuler un suivi
   */
  async cancelFollowUp(id: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.CANCELLED,
      },
    });
  }

  /**
   * Annuler tous les suivis d'un contact
   */
  async cancelAllForContact(contactJid: string) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: contactJid },
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    return this.prisma.followUp.updateMany({
      where: {
        contactId: contact.id,
        status: FollowUpStatus.PENDING,
      },
      data: {
        status: FollowUpStatus.CANCELLED,
      },
    });
  }

  /**
   * Récupérer l'historique des suivis d'un contact
   */
  async getContactFollowUps(contactJid: string) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { jid: contactJid },
    });

    if (!contact) {
      return [];
    }

    return this.prisma.followUp.findMany({
      where: { contactId: contact.id },
      include: { template: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  /**
   * Obtenir les statistiques des suivis
   */
  async getStats(filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where = {
      ...(filters?.startDate || filters?.endDate
        ? {
            scheduledAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const [total, byStatus, pending, overdue] = await Promise.all([
      this.prisma.followUp.count({ where }),
      this.prisma.followUp.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.followUp.count({
        where: { ...where, status: FollowUpStatus.PENDING },
      }),
      this.prisma.followUp.count({
        where: {
          status: FollowUpStatus.PENDING,
          scheduledAt: { lt: new Date() },
        },
      }),
    ]);

    return {
      total,
      byStatus,
      pending,
      overdue,
    };
  }

  /**
   * Remplacer les variables dans le message
   */
  replaceVariables(message: string, variables: Record<string, any>): string {
    let result = message;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }
}