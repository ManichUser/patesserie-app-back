// src/whatsapp/whatsapp.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppSchedulerService } from './whatsapp-scheduler.service';
import { WhatsAppCronService } from './whatsapp-cron.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsAppSchedulerController } from './whatsapp-scheduler.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Activer les crons
    PrismaModule,
  ],
  controllers: [WhatsappController, WhatsAppSchedulerController],
  providers: [WhatsappService, WhatsAppSchedulerService, WhatsAppCronService],
  exports: [WhatsappService, WhatsAppSchedulerService],
})
export class WhatsappModule {}