// src/whatsapp/whatsapp-scheduler.controller.ts

import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Query,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { WhatsAppSchedulerService } from './whatsapp-scheduler.service';
  import { WhatsAppCronService } from './whatsapp-cron.service';
  import {
    ScheduleStatus,
    RecipientType,
    WhatsAppMessageType,
  } from 'src/generated/prisma/enums';
import { from } from 'rxjs';

  
  @Controller('whatsapp/scheduler')
  export class WhatsAppSchedulerController {
    constructor(
      private schedulerService: WhatsAppSchedulerService,
      private cronService: WhatsAppCronService,
    ) {}
  
    /**
     * POST /whatsapp/scheduler
     * Créer un message programmé
     */
    @Post()
    async createScheduledMessage(
      @Body()
      body: {
        message: string;
        type?: WhatsAppMessageType;
        scheduledAt: string; // ISO date
        recipients: Array<{
          recipient: string;
          type: RecipientType;
        }>;
      },
    ) {
      // Validation
      if (!body.message || !body.recipients || body.recipients.length === 0) {
        throw new HttpException(
          'Message et destinataires requis',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      const scheduledAt = new Date(body.scheduledAt);
  
      // La date ne peut pas être dans le passé
      if (scheduledAt < new Date()) {
        throw new HttpException(
          'La date programmée doit être dans le futur',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      const schedule = await this.schedulerService.createScheduledMessage({
        message: body.message,
        type: body.type,
        scheduledAt,
        recipients: body.recipients,
      });
  
      return {
        success: true,
        message: 'Message programmé créé',
        data: schedule,
      };
    }
  
    /**
     * GET /whatsapp/scheduler
     * Liste des messages programmés
     */
    @Get()
    async getSchedules(
      @Query('status') status?: ScheduleStatus,
      @Query('type') type?: WhatsAppMessageType,
      @Query('limit') limit?: string,
    ) {
      const schedules = await this.schedulerService.getScheduleHistory({
        status,
        type,
        limit: limit ? parseInt(limit) : undefined,
      });
  
      return {
        success: true,
        data: schedules,
      };
    }
  
    /**
     * GET /whatsapp/scheduler/stats
     * Statistiques
     */
    @Get('stats')
    async getStats() {
      const stats = await this.schedulerService.getStats();
  
      return {
        success: true,
        data: stats,
      };
    }
  
    /**
     * DELETE /whatsapp/scheduler/:id
     * Annuler un message programmé
     */
    @Delete(':id')
    async cancelSchedule(@Param('id') id: string) {
      await this.schedulerService.cancelSchedule(id);
  
      return {
        success: true,
        message: 'Message programmé annulé',
      };
    }
  
    /**
     * POST /whatsapp/scheduler/trigger-now
     * Forcer l'exécution du cron (pour tests)
     */
    @Post('trigger-now')
    async triggerCron() {
      await this.cronService.triggerManually();
  
      return {
        success: true,
        message: 'Cron exécuté manuellement',
      };
    }
  }