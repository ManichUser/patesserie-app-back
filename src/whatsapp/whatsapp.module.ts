// src/whatsapp/whatsapp.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppSchedulerService } from './whatsapp-scheduler.service';
import { WhatsAppCronService } from './whatsapp-cron.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsAppSchedulerController } from './whatsapp-scheduler.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppGroupsController } from './whatsapp-groups.controller';
import { WhatsAppGroupsService } from './whatsapp-groups.service';
import { AutoReplyController } from './auto-reply.controller';
import { AutoReplyService } from './auto-reply.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Activer les crons
    PrismaModule,
  ],
  controllers: [WhatsappController,
    WhatsAppSchedulerController,
    WhatsAppGroupsController,
    AutoReplyController,
  ],
  providers: [WhatsappService,
    WhatsAppSchedulerService,
    WhatsAppCronService,
    WhatsAppGroupsService,
    AutoReplyService,
  ],
  exports: [WhatsappService, WhatsAppSchedulerService,WhatsappService,AutoReplyService],
})
export class WhatsappModule {
  constructor(
    private whatsappService: WhatsappService,
    private autoReplyService: AutoReplyService,
  ){
    this.whatsappService.setAutoReplyService(this.autoReplyService);
  }
}