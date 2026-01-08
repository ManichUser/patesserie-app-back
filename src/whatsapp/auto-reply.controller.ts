// src/whatsapp/auto-reply.controller.ts

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';
import { MatchType } from 'src/generated/prisma/enums';
  
  @Controller('whatsapp/auto-reply')
  export class AutoReplyController {
    constructor(private autoReplyService: AutoReplyService) {}
  
    /**
     * POST /whatsapp/auto-reply
     * Créer une réponse automatique
     */
    @Post()
    async create(
      @Body()
      body: {
        keyword: string;
        response: string;
        matchType?: MatchType;
        priority?: number;
        isActive?: boolean;
      },
    ) {
      try {
        const autoReply = await this.autoReplyService.createAutoReply(body);
        
        return {
          success: true,
          message: 'Réponse automatique créée',
          data: autoReply,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/auto-reply
     * Lister toutes les réponses automatiques
     */
    @Get()
    async getAll(
      @Query('isActive') isActive?: string,
      @Query('search') search?: string,
    ) {
      try {
        const replies = await this.autoReplyService.getAllAutoReplies({
          isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
          search,
        });
        
        return {
          success: true,
          count: replies.length,
          data: replies,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/auto-reply/stats
     * Obtenir les statistiques
     */
    @Get('stats')
    async getStats() {
      try {
        const stats = await this.autoReplyService.getStats();
        
        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/auto-reply/:id
     * Obtenir une réponse automatique par ID
     */
    @Get(':id')
    async getById(@Param('id') id: string) {
      try {
        const reply = await this.autoReplyService.getAutoReplyById(id);
        
        if (!reply) {
          throw new HttpException(
            'Réponse automatique non trouvée',
            HttpStatus.NOT_FOUND,
          );
        }
        
        return {
          success: true,
          data: reply,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * PUT /whatsapp/auto-reply/:id
     * Mettre à jour une réponse automatique
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body()
      body: {
        keyword?: string;
        response?: string;
        matchType?: MatchType;
        priority?: number;
        isActive?: boolean;
      },
    ) {
      try {
        const updated = await this.autoReplyService.updateAutoReply(id, body);
        
        return {
          success: true,
          message: 'Réponse automatique mise à jour',
          data: updated,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * DELETE /whatsapp/auto-reply/:id
     * Supprimer une réponse automatique
     */
    @Delete(':id')
    async delete(@Param('id') id: string) {
      try {
        await this.autoReplyService.deleteAutoReply(id);
        
        return {
          success: true,
          message: 'Réponse automatique supprimée',
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * PATCH /whatsapp/auto-reply/:id/toggle
     * Activer/Désactiver une réponse automatique
     */
    @Patch(':id/toggle')
    async toggle(@Param('id') id: string) {
      try {
        const updated = await this.autoReplyService.toggleAutoReply(id);
        
        return {
          success: true,
          message: `Réponse automatique ${updated.isActive ? 'activée' : 'désactivée'}`,
          data: updated,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }