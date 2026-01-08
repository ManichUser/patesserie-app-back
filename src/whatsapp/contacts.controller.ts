// src/whatsapp/contacts.controller.ts

import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Body,
    Param,
    Query,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { WhatsAppContactsService } from './contacts.service';
  import { CustomerSegment } from 'src/generated/prisma/enums';
  
  @Controller('whatsapp/contacts')
  export class ContactsController {
    constructor(private contactsService: WhatsAppContactsService) {}
  
    /**
     * GET /whatsapp/contacts
     * Lister tous les contacts
     */
    @Get()
    async getAllContacts(
      @Query('segment') segment?: CustomerSegment,
      @Query('search') search?: string,
      @Query('isBlocked') isBlocked?: string,
      @Query('isFavorite') isFavorite?: string,
    ) {
      try {
        const contacts = await this.contactsService.getAllContacts({
          segment,
          search,
          isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
          isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
        });
  
        return {
          success: true,
          count: contacts.length,
          data: contacts,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/contacts/stats
     * Statistiques des contacts
     */
    @Get('stats')
    async getStats() {
      try {
        const stats = await this.contactsService.getStats();
  
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
     * GET /whatsapp/contacts/:jid
     * Obtenir un contact
     */
    @Get(':jid')
    async getContact(@Param('jid') jid: string) {
      try {
        const contact = await this.contactsService.getContactByJid(jid);
  
        if (!contact) {
          throw new HttpException('Contact non trouvé', HttpStatus.NOT_FOUND);
        }
  
        return {
          success: true,
          data: contact,
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * PATCH /whatsapp/contacts/:jid
     * Mettre à jour un contact
     */
    @Patch(':jid')
    async updateContact(
      @Param('jid') jid: string,
      @Body()
      body: {
        name?: string;
        tags?: string[];
        notes?: string;
        segment?: CustomerSegment;
        isFavorite?: boolean;
        isBlocked?: boolean;
      },
    ) {
      try {
        const updated = await this.contactsService.updateContact(jid, body);
  
        return {
          success: true,
          message: 'Contact mis à jour',
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
     * POST /whatsapp/contacts/:jid/tags
     * Ajouter des tags
     */
    @Post(':jid/tags')
    async addTags(@Param('jid') jid: string, @Body('tags') tags: string[]) {
      try {
        const updated = await this.contactsService.addTags(jid, tags);
  
        return {
          success: true,
          message: 'Tags ajoutés',
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
     * DELETE /whatsapp/contacts/:jid/tags
     * Supprimer des tags
     */
    @Delete(':jid/tags')
    async removeTags(@Param('jid') jid: string, @Body('tags') tags: string[]) {
      try {
        const updated = await this.contactsService.removeTags(jid, tags);
  
        return {
          success: true,
          message: 'Tags supprimés',
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
     * POST /whatsapp/contacts/:jid/recalculate-segment
     * Recalculer le segment
     */
    @Post(':jid/recalculate-segment')
    async recalculateSegment(@Param('jid') jid: string) {
      try {
        const newSegment = await this.contactsService.recalculateSegment(jid);
  
        return {
          success: true,
          message: 'Segment recalculé',
          data: { segment: newSegment },
        };
      } catch (error) {
        throw new HttpException(
          error instanceof Error ? error.message : 'Erreur inconnue',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }