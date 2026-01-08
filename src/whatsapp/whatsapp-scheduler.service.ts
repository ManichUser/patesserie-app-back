import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  ScheduleStatus,
  RecipientType,
  WhatsAppMessageType
} from 'src/generated/prisma/enums';


@Injectable()
export class WhatsAppSchedulerService {
  private logger = new Logger(WhatsAppSchedulerService.name);

  constructor(private prisma: PrismaService) {
  this.logger.log(`🌍 Timezone serveur: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  this.logger.log(`⏰ Offset: ${new Date().getTimezoneOffset()} minutes`);
  this.logger.log(`🕐 Heure serveur: ${new Date().toISOString()}`);
  this.logger.log(`🕐 Heure locale: ${new Date().toLocaleString()}`);
  }

  /**
   * Créer un message programmé avec destinataires
   */
  async createScheduledMessage(data: {
  message: string;
  type?: WhatsAppMessageType;
  mediaUrl?: string; 
  scheduledAt: Date;
  recipients: Array<{
    recipient: string;
    type: RecipientType;
  }>;
}) {
  return this.prisma.whatsAppSchedule.create({
    data: {
      message: data.message,
      type: data.type || WhatsAppMessageType.TEXT,
      mediaUrl: data.mediaUrl, 
      scheduledAt: data.scheduledAt,
      status: ScheduleStatus.PENDING,
      recipients: {
        create: data.recipients.map(r => ({
          recipient: r.recipient,
          type: r.type,
          status: ScheduleStatus.PENDING,
        })),
      },
    },
    include: {
      recipients: true,
    },
  });
}

  
  /**
   * ✅ NOUVEAU : Récupérer TOUS les messages en attente (pour debug)
   */
  async getAllPending() {
    return this.prisma.whatsAppSchedule.findMany({
      where: {
        status: ScheduleStatus.PENDING,
      },
      include: {
        recipients: {
          where: {
            status: ScheduleStatus.PENDING,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }

  /**
   * Récupérer les messages à envoyer maintenant
   */
  async getMessagesToSend() {
    const now = new Date();
    
    // ✅ Logger pour debug
    this.logger.debug(`🔍 Recherche de messages avant: ${now.toISOString()}`);
    
    const messages = await this.prisma.whatsAppSchedule.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledAt: {
          lte: now, // Inférieur ou égal à maintenant
        },
      },
      include: {
        recipients: {
          where: {
            status: ScheduleStatus.PENDING,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    this.logger.debug(`🔍 ${messages.length} message(s) trouvé(s)`);
    
    return messages;
  }

  /**
   * Marquer un destinataire comme envoyé
   */
  async markRecipientAsSent(recipientId: string) {
    return this.prisma.whatsAppRecipient.update({
      where: { id: recipientId },
      data: {
        status: ScheduleStatus.SENT,
      },
    });
  }

  /**
   * Marquer un destinataire comme échoué
   */
  async markRecipientAsFailed(recipientId: string, error: string) {
    return this.prisma.whatsAppRecipient.update({
      where: { id: recipientId },
      data: {
        status: ScheduleStatus.FAILED,
        error: error.substring(0, 500), // Limiter la taille de l'erreur
      },
    });
  }

  /**
   * Marquer un schedule comme complètement envoyé
   */
  async markScheduleAsSent(scheduleId: string) {
    // Vérifier si tous les destinataires sont envoyés ou échoués
    const schedule = await this.prisma.whatsAppSchedule.findUnique({
      where: { id: scheduleId },
      include: { recipients: true },
    });

    if (!schedule) return;

    const allProcessed = schedule.recipients.every(
      r => r.status !== ScheduleStatus.PENDING,
    );

    if (allProcessed) {
      await this.prisma.whatsAppSchedule.update({
        where: { id: scheduleId },
        data: {
          status: ScheduleStatus.SENT,
          sentAt: new Date(),
        },
      });
    }
  }

  /**
   * Marquer un schedule comme échoué
   */
  async markScheduleAsFailed(scheduleId: string, error: string) {
    return this.prisma.whatsAppSchedule.update({
      where: { id: scheduleId },
      data: {
        status: ScheduleStatus.FAILED,
        error: error.substring(0, 500),
      },
    });
  }

  /**
   * Annuler un message programmé (et tous ses destinataires)
   */
  async cancelSchedule(scheduleId: string) {
    // Annuler tous les destinataires en attente
    await this.prisma.whatsAppRecipient.updateMany({
      where: {
        scheduleId,
        status: ScheduleStatus.PENDING,
      },
      data: {
        status: ScheduleStatus.FAILED,
        error: 'Annulé par l\'utilisateur',
      },
    });

    // Marquer le schedule comme échoué
    return this.prisma.whatsAppSchedule.update({
      where: { id: scheduleId },
      data: {
        status: ScheduleStatus.FAILED,
        error: 'Annulé par l\'utilisateur',
      },
    });
  }

  /**
   * Obtenir l'historique des messages
   */
  async getScheduleHistory(filters?: {
    status?: ScheduleStatus;
    type?: WhatsAppMessageType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return this.prisma.whatsAppSchedule.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.startDate || filters?.endDate
          ? {
              scheduledAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
      include: {
        recipients: true,
      },
      orderBy: {
        scheduledAt: 'desc',
      },
      take: filters?.limit || 100,
    });
  }

  /**
   * Obtenir les statistiques
   */
  async getStats() {
    const [schedules, recipients] = await Promise.all([
      // Stats des schedules
      this.prisma.whatsAppSchedule.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Stats des recipients
      this.prisma.whatsAppRecipient.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      schedules: {
        pending: schedules.find(s => s.status === ScheduleStatus.PENDING)?._count || 0,
        sent: schedules.find(s => s.status === ScheduleStatus.SENT)?._count || 0,
        failed: schedules.find(s => s.status === ScheduleStatus.FAILED)?._count || 0,
      },
      recipients: {
        pending: recipients.find(r => r.status === ScheduleStatus.PENDING)?._count || 0,
        sent: recipients.find(r => r.status === ScheduleStatus.SENT)?._count || 0,
        failed: recipients.find(r => r.status === ScheduleStatus.FAILED)?._count || 0,
      },
    };
  }
}