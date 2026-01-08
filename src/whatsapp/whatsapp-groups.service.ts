// src/whatsapp/whatsapp-groups.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsAppGroupsService {
  private logger = new Logger(WhatsAppGroupsService.name);

  constructor(
    private whatsappService: WhatsappService,
    private prisma: PrismaService,
  ) {}

  /**
   * Récupérer tous les groupes depuis WhatsApp
   */
  async fetchAllGroups() {
    const sock = this.whatsappService['sock']; // Accès au socket
    
    if (!sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      const groups = await sock.groupFetchAllParticipating();
      
      const groupsList = Object.values(groups).map((group: any) => ({
        jid: group.id,
        name: group.subject,
        description: group.desc || null,
        participantsCount: group.participants?.length || 0,
        owner: group.owner || null,
        created: group.creation || null,
        participants: group.participants?.map((p: any) => ({
          jid: p.id,
          isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
        })) || [],
      }));

      this.logger.log(`📋 ${groupsList.length} groupes récupérés`);
      
      return groupsList;
    } catch (error) {
      this.logger.error('❌ Erreur récupération groupes:', error);
      throw error;
    }
  }

  /**
   * Synchroniser les groupes avec la base de données
   */
  async syncGroupsToDatabase() {
    const groups = await this.fetchAllGroups();
    
    let syncedCount = 0;
    
    for (const group of groups) {
      try {
        await this.prisma.whatsAppGroup.upsert({
          where: { jid: group.jid },
          create: {
            jid: group.jid,
            name: group.name,
            description: group.description,
            participantsCount: group.participantsCount,
            isActive: true,
            lastSyncAt: new Date(),
          },
          update: {
            name: group.name,
            description: group.description,
            participantsCount: group.participantsCount,
            lastSyncAt: new Date(),
          },
        });
        
        syncedCount++;
      } catch (error) {
        this.logger.error(`❌ Erreur sync groupe ${group.name}:`, error);
      }
    }
    
    this.logger.log(`✅ ${syncedCount} groupes synchronisés`);
    
    return { synced: syncedCount, total: groups.length };
  }

  /**
   * Obtenir les détails d'un groupe
   */
  async getGroupDetails(groupJid: string) {
    const sock = this.whatsappService['sock'];
    
    if (!sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      const metadata = await sock.groupMetadata(groupJid);
      
      return {
        jid: metadata.id,
        name: metadata.subject,
        description: metadata.desc || null,
        owner: metadata.owner,
        created: metadata.creation,
        participantsCount: metadata.participants.length,
        participants: metadata.participants.map((p: any) => ({
          jid: p.id,
          isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
        })),
      };
    } catch (error) {
      this.logger.error(`❌ Erreur détails groupe ${groupJid}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un message à un groupe
   */
  async sendMessageToGroup(groupJid: string, message: string) {
    return this.whatsappService.sendMessage(groupJid, message);
  }

  /**
   * Envoyer une image à un groupe
   */
  async sendImageToGroup(groupJid: string, imageUrl: string, caption?: string) {
    return this.whatsappService.sendImageFromUrl(groupJid, imageUrl, caption);
  }

  /**
   * Envoyer une vidéo à un groupe
   */
  async sendVideoToGroup(groupJid: string, videoUrl: string, caption?: string) {
    return this.whatsappService.sendVideoFromUrl(groupJid, videoUrl, caption);
  }

  /**
   * Récupérer les groupes depuis la DB
   */
  async getGroupsFromDatabase(filters?: {
    isActive?: boolean;
    search?: string;
  }) {
    return this.prisma.whatsAppGroup.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Activer/Désactiver un groupe
   */
  async toggleGroupStatus(groupJid: string, isActive: boolean) {
    return this.prisma.whatsAppGroup.update({
      where: { jid: groupJid },
      data: { isActive },
    });
  }

  /**
   * Envoyer un message à tous les groupes actifs
   */
  async broadcastToAllGroups(message: string, mediaUrl?: string, mediaType?: 'image' | 'video') {
    const groups = await this.getGroupsFromDatabase({ isActive: true });
    
    const results = {
      total: groups.length,
      sent: 0,
      failed: 0,
      details: [] as Array<{ group: string; status: 'sent' | 'failed'; error?: string }>,
    };

    for (const group of groups) {
      try {
        if (mediaUrl && mediaType === 'image') {
          await this.sendImageToGroup(group.jid, mediaUrl, message);
        } else if (mediaUrl && mediaType === 'video') {
          await this.sendVideoToGroup(group.jid, mediaUrl, message);
        } else {
          await this.sendMessageToGroup(group.jid, message);
        }

        results.sent++;
        results.details.push({ group: group.name, status: 'sent' });
        
        this.logger.log(`✅ Message envoyé au groupe ${group.name}`);
        
        // Anti-spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.failed++;
        results.details.push({
          group: group.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
        
        this.logger.error(`❌ Erreur envoi au groupe ${group.name}:`, error);
      }
    }

    this.logger.log(`📊 Broadcast: ${results.sent}/${results.total} groupes`);
    
    return results;
  }
}