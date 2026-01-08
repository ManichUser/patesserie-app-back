// src/whatsapp/whatsapp-groups.controller.ts

import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { WhatsAppGroupsService } from './whatsapp-groups.service';
  
  @Controller('whatsapp/groups')
  export class WhatsAppGroupsController {
    constructor(private groupsService: WhatsAppGroupsService) {}
  
    /**
     * GET /whatsapp/groups
     * Récupérer tous les groupes depuis WhatsApp
     */
    @Get()
    async getAllGroups() {
      try {
        const groups = await this.groupsService.fetchAllGroups();
        
        return {
          success: true,
          count: groups.length,
          data: groups,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/groups/database
     * Récupérer les groupes depuis la DB
     */
    @Get('database')
    async getGroupsFromDB(
      @Query('search') search?: string,
      @Query('isActive') isActive?: string,
    ) {
      try {
        const groups = await this.groupsService.getGroupsFromDatabase({
          search,
          isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
        
        return {
          success: true,
          count: groups.length,
          data: groups,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * POST /whatsapp/groups/sync
     * Synchroniser les groupes avec la DB
     */
    @Post('sync')
    async syncGroups() {
      try {
        const result = await this.groupsService.syncGroupsToDatabase();
        
        return {
          success: true,
          message: `${result.synced}/${result.total} groupes synchronisés`,
          data: result,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/groups/:jid
     * Obtenir les détails d'un groupe
     */
    @Get(':jid')
    async getGroupDetails(@Param('jid') jid: string) {
      try {
        const group = await this.groupsService.getGroupDetails(jid);
        
        return {
          success: true,
          data: group,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * POST /whatsapp/groups/send
     * Envoyer un message à un groupe
     */
    @Post('send')
    async sendToGroup(
      @Body() body: {
        groupJid: string;
        message: string;
        mediaUrl?: string;
        mediaType?: 'image' | 'video';
      },
    ) {
      try {
        if (body.mediaUrl && body.mediaType === 'image') {
          await this.groupsService.sendImageToGroup(
            body.groupJid,
            body.mediaUrl,
            body.message,
          );
        } else if (body.mediaUrl && body.mediaType === 'video') {
          await this.groupsService.sendVideoToGroup(
            body.groupJid,
            body.mediaUrl,
            body.message,
          );
        } else {
          await this.groupsService.sendMessageToGroup(body.groupJid, body.message);
        }
        
        return {
          success: true,
          message: 'Message envoyé au groupe',
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * POST /whatsapp/groups/broadcast
     * Envoyer un message à tous les groupes actifs
     */
    @Post('broadcast')
    async broadcastToGroups(
      @Body() body: {
        message: string;
        mediaUrl?: string;
        mediaType?: 'image' | 'video';
      },
    ) {
      try {
        const result = await this.groupsService.broadcastToAllGroups(
          body.message,
          body.mediaUrl,
          body.mediaType,
        );
        
        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * PATCH /whatsapp/groups/:jid/toggle
     * Activer/Désactiver un groupe
     */
    @Patch(':jid/toggle')
    async toggleGroup(
      @Param('jid') jid: string,
      @Body('isActive') isActive: boolean,
    ) {
      try {
        await this.groupsService.toggleGroupStatus(jid, isActive);
        
        return {
          success: true,
          message: `Groupe ${isActive ? 'activé' : 'désactivé'}`,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }