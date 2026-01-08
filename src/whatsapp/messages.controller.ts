// src/whatsapp/messages.controller.ts

import {
    Controller,
    Get,
    Delete,
    Param,
    Query,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { MessagesService } from './messages.service';
  
  @Controller('whatsapp/messages')
  export class MessagesController {
    constructor(private messagesService: MessagesService) {}
  
    /**
     * GET /whatsapp/messages/conversation/:jid
     * Historique d'une conversation
     */
    @Get('conversation/:jid')
    async getConversation(
      @Param('jid') jid: string,
      @Query('limit') limit?: string,
    ) {
      try {
        const messages = await this.messagesService.getConversationHistory(
          jid,
          limit ? parseInt(limit) : 50,
        );
  
        return {
          success: true,
          count: messages.length,
          data: messages,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/messages/search
     * Rechercher dans les messages
     */
    @Get('search')
    async searchMessages(
      @Query('query') query: string,
      @Query('limit') limit?: string,
    ) {
      try {
        if (!query) {
          throw new HttpException(
            'Le paramètre "query" est requis',
            HttpStatus.BAD_REQUEST,
          );
        }
  
        const messages = await this.messagesService.searchMessages(
          query,
          limit ? parseInt(limit) : 50,
        );
  
        return {
          success: true,
          count: messages.length,
          data: messages,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/messages/stats
     * Statistiques des messages
     */
    @Get('stats')
    async getStats(
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ) {
      try {
        const stats = await this.messagesService.getStats({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });
  
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
     * DELETE /whatsapp/messages/conversation/:jid
     * Supprimer l'historique d'une conversation
     */
    @Delete('conversation/:jid')
    async deleteConversation(@Param('jid') jid: string) {
      try {
        await this.messagesService.deleteConversationHistory(jid);
  
        return {
          success: true,
          message: 'Historique supprimé',
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }