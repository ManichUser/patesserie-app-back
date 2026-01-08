// src/whatsapp/follow-up-cron.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FollowUpService } from './follow-up.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppMessageType } from 'src/generated/prisma/enums';

@Injectable()
export class FollowUpCronService {
  private logger = new Logger(FollowUpCronService.name);
  private isProcessing = false;

  constructor(
    private followUpService: FollowUpService,
    private whatsappService: WhatsappService,
  ) {}

  /**
   * Cron qui s'exécute toutes les 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processFollowUps() {
    if (this.isProcessing) {
      this.logger.debug('⏭️ Traitement des suivis déjà en cours, skip...');
      return;
    }

    this.isProcessing = true;

    try {
      const status = this.whatsappService.getStatus();
      if (!status.isConnected) {
        this.logger.warn('⚠️ WhatsApp non connecté, skip du cron suivis');
        return;
      }

      const now = new Date();
      this.logger.debug(`🕐 Vérification des suivis à ${now.toISOString()}`);

      const followUps = await this.followUpService.getFollowUpsToSend();

      if (followUps.length === 0) {
        this.logger.debug('✅ Aucun suivi à envoyer');
        return;
      }

      this.logger.log(`📬 ${followUps.length} suivi(s) à envoyer`);

      for (const followUp of followUps) {
        try {
          // Remplacer les variables dans le message
        const variables = {
            nom: followUp.contact.name || followUp.contact.pushName || 'Client',
            prenom: followUp.contact.name?.split(' ')[0] || 'Client',
            total_commandes: followUp.contact.totalOrders,
            total_depense: followUp.contact.totalSpent,
            ...(typeof followUp.metadata === 'object' ? followUp.metadata : {}),
        };

        const message = this.followUpService.replaceVariables(
            followUp.template.message,
            variables,
        );

          // Envoyer le message
          if (followUp.template.mediaUrl && followUp.template.mediaType) {
            if (followUp.template.mediaType === WhatsAppMessageType.IMAGE) {
              await this.whatsappService.sendImageFromUrl(
                followUp.contact.jid,
                followUp.template.mediaUrl,
                message,
              );
            } else if (followUp.template.mediaType === WhatsAppMessageType.VIDEO) {
              await this.whatsappService.sendVideoFromUrl(
                followUp.contact.jid,
                followUp.template.mediaUrl,
                message,
              );
            }
          } else {
            await this.whatsappService.sendMessage(
              followUp.contact.jid,
              message,
            );
          }

          // Marquer comme envoyé
          await this.followUpService.markAsSent(followUp.id);

          this.logger.log(
            `✅ Suivi envoyé: "${followUp.template.name}" à ${followUp.contact.jid}`,
          );

          // Délai anti-spam
          await this.sleep(2000);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erreur inconnue';

          await this.followUpService.markAsFailed(followUp.id, errorMessage);

          this.logger.error(
            `❌ Échec envoi suivi ${followUp.id}:`,
            errorMessage,
          );
        }
      }

      this.logger.log('✅ Traitement des suivis terminé');
    } catch (error) {
      this.logger.error('❌ Erreur dans le cron des suivis:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Forcer l'exécution manuelle du cron
   */
  async triggerManually() {
    this.logger.log('🔧 Exécution manuelle du cron des suivis');
    await this.processFollowUps();
  }
}