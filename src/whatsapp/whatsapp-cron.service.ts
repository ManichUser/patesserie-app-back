// src/whatsapp/whatsapp-cron.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppSchedulerService } from './whatsapp-scheduler.service';
import { WhatsAppMessageType } from 'src/generated/prisma/enums';

@Injectable()
export class WhatsAppCronService {
  private logger = new Logger(WhatsAppCronService.name);
  private isProcessing = false;

  constructor(
    private whatsappService: WhatsappService,
    private schedulerService: WhatsAppSchedulerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledMessages() {
    if (this.isProcessing) {
      this.logger.debug('⏭️ Traitement déjà en cours, skip...');
      return;
    }

    this.isProcessing = true;

    try {
      const status = this.whatsappService.getStatus();
      if (!status.isConnected) {
        this.logger.warn('⚠️ WhatsApp non connecté, skip du cron');
        return;
      }

      // ✅ Afficher l'heure actuelle pour debug
      const now = new Date();
      this.logger.debug(`🕐 Heure actuelle (serveur): ${now.toISOString()}`);

      const schedules = await this.schedulerService.getMessagesToSend();

      // ✅ Logger les détails si aucun message
      if (schedules.length === 0) {
        this.logger.debug('✅ Aucun message à envoyer');
        
        // Vérifier s'il y a des messages en attente
        const allPending = await this.schedulerService.getAllPending();
        if (allPending.length > 0) {
          this.logger.debug(`📋 Messages en attente: ${allPending.length}`);
          allPending.forEach(s => {
            this.logger.debug(
              `   - ${s.id}: schedulé à ${s.scheduledAt.toISOString()} (dans ${Math.round((s.scheduledAt.getTime() - now.getTime()) / 1000)}s)`,
            );
          });
        }
        return;
      }

      this.logger.log(`📬 ${schedules.length} schedule(s) à traiter`);

// src/whatsapp/whatsapp-cron.service.ts

for (const schedule of schedules) {
  try {
    let successCount = 0;
    let failCount = 0;

    // ✅ Gérer les différents types de messages
    if (schedule.type === WhatsAppMessageType.STATUS) {
      // Envoyer un statut (pas de destinataires individuels)
      try {
        if (schedule.mediaUrl) {
          // Statut avec média
          if (schedule.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            await this.whatsappService.sendImageStatus(
              schedule.mediaUrl,
              schedule.message,
            );
          } else if (schedule.mediaUrl.match(/\.(mp4|mov|avi)$/i)) {
            await this.whatsappService.sendVideoStatus(
              schedule.mediaUrl,
              schedule.message,
            );
          }
        } else {
          // Statut texte uniquement
          await this.whatsappService.sendTextStatus(schedule.message);
        }

        successCount++;
        this.logger.log(`📢 Statut ${schedule.id} publié`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        await this.schedulerService.markScheduleAsFailed(schedule.id, errorMessage);
        failCount++;
        this.logger.error(`❌ Échec publication statut: ${errorMessage}`);
      }
    } else {
      // Envoyer aux destinataires individuels (logique existante)
      for (const recipient of schedule.recipients) {
        try {
          if (schedule.type === WhatsAppMessageType.IMAGE && schedule.mediaUrl) {
            await this.whatsappService.sendImageFromUrl(
              recipient.recipient,
              schedule.mediaUrl,
              schedule.message,
            );
          } else if (schedule.type === WhatsAppMessageType.VIDEO && schedule.mediaUrl) {
            // Télécharger et envoyer la vidéo
            const response = await fetch(schedule.mediaUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await this.whatsappService.sendVideoFromBuffer(
              recipient.recipient,
              buffer,
              schedule.message,
            );
          } else {
            // Message texte
            await this.whatsappService.sendMessage(
              recipient.recipient,
              schedule.message,
            );
          }

          await this.schedulerService.markRecipientAsSent(recipient.id);
          successCount++;

          this.logger.log(
            `✅ Message ${schedule.id} envoyé à ${recipient.recipient}`,
          );

          await this.sleep(1000);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          
          await this.schedulerService.markRecipientAsFailed(
            recipient.id,
            errorMessage,
          );
          failCount++;

          this.logger.error(
            `❌ Échec d'envoi à ${recipient.recipient}: ${errorMessage}`,
          );
        }
      }
    }

    await this.schedulerService.markScheduleAsSent(schedule.id);

    this.logger.log(
      `📊 Schedule ${schedule.id}: ${successCount} envoyés, ${failCount} échecs`,
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    await this.schedulerService.markScheduleAsFailed(
      schedule.id,
      errorMessage,
    );

    this.logger.error(
      `❌ Échec du traitement du schedule ${schedule.id}: ${errorMessage}`,
    );
  }
}
      this.logger.log('✅ Traitement des messages terminé');

    } catch (error) {
      this.logger.error('❌ Erreur dans le cron:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async triggerManually() {
    this.logger.log('🔧 Exécution manuelle du cron');
    await this.processScheduledMessages();
  }
}