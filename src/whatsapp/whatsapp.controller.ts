// src/whatsapp/whatsapp.controller.ts

import { 
    Controller, 
    Post, 
    Get, 
    Delete, 
    Body, 
    HttpException, 
    HttpStatus, 
    Param
  } from '@nestjs/common';
  import { WhatsappService } from './whatsapp.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
  
  // Helper pour extraire le message d'erreur
  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Erreur inconnue';
  }
  
  @Controller('whatsapp')
  export class WhatsappController {
    constructor(private whatsappService: WhatsappService) {}
  
    /**
     * POST /whatsapp/connect
     * Connecter WhatsApp avec pairing code
     */
    @Post('connect')
    async connect(@Body('phoneNumber') phoneNumber: string) {
      if (!phoneNumber) {
        throw new HttpException(
          'Le numéro de téléphone est requis',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new HttpException(
          'Numéro de téléphone invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        const pairingCode = await this.whatsappService.connect(cleanPhone);
        
        return {
          success: true,
          pairingCode,
          phoneNumber: cleanPhone,
          message: pairingCode 
            ? 'Entrez ce code dans WhatsApp > Appareils connectés' 
            : 'Reconnexion en cours...',
        };
      } catch (error) {
        throw new HttpException(
          getErrorMessage(error),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * GET /whatsapp/status
     * Obtenir le statut de connexion
     */
    @Get('status')
    getStatus() {
      return this.whatsappService.getStatus();
    }
  
    /**
     * POST /whatsapp/send
     * Envoyer un message à une personne
     */
    @Post('send')
    async sendMessage(@Body() body: { to: string; message: string }) {
      if (!body.to || !body.message) {
        throw new HttpException(
          'Les champs "to" et "message" sont requis',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        await this.whatsappService.sendMessage(body.to, body.message);
        return { 
          success: true,
          message: 'Message envoyé',
          to: body.to,
        };
      } catch (error) {
        throw new HttpException(
          getErrorMessage(error),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * POST /whatsapp/send-bulk
     * Envoyer un message à plusieurs personnes
     */
    @Post('send-bulk')
    async sendBulkMessage(
      @Body() body: { recipients: string[]; message: string },
    ) {
      if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
        throw new HttpException(
          'Le champ "recipients" doit être un tableau non vide',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      if (!body.message) {
        throw new HttpException(
          'Le champ "message" est requis',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        const results = await this.whatsappService.sendBulkMessage(
          body.recipients,
          body.message,
        );
  
        return {
          success: true,
          total: results.total,
          sent: results.sent,
          failed: results.failed,
          details: results.details,
        };
      } catch (error) {
        throw new HttpException(
          getErrorMessage(error),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    /**
     * POST /whatsapp/send-image
     * Envoyer une image
     */
    @Post('send-image')
    async sendImage(
      @Body() body: { to: string; imageUrl: string; caption?: string },
    ) {
      if (!body.to || !body.imageUrl) {
        throw new HttpException(
          'Les champs "to" et "imageUrl" sont requis',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        await this.whatsappService.sendImageFromUrl(
          body.to,
          body.imageUrl,
          body.caption,
        );
  
        return {
          success: true,
          message: 'Image envoyée',
          to: body.to,
        };
      } catch (error) {
        throw new HttpException(
          getErrorMessage(error),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  /**
   * POST /whatsapp/status/text
   * Publier un statut texte
   */
  @Post('status/text')
  async sendTextStatus(@Body() body: { message: string }) {
    if (!body.message) {
      throw new HttpException(
        'Le champ "message" est requis',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.whatsappService.sendTextStatus(body.message);
      return {
        success: true,
        message: 'Statut texte publié',
      };
    } catch (error) {
      throw new HttpException(
        getErrorMessage(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /whatsapp/status/image
   * Publier un statut image
   */
  @Post('status/image')
  async sendImageStatus(
    @Body() body: { imageUrl: string; caption?: string },
  ) {
    if (!body.imageUrl) {
      throw new HttpException(
        'Le champ "imageUrl" est requis',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.whatsappService.sendImageStatus(body.imageUrl, body.caption);
      return {
        success: true,
        message: 'Statut image publié',
      };
    } catch (error) {
      throw new HttpException(
        getErrorMessage(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /whatsapp/status/video
   * Publier un statut vidéo
   */
  @Post('status/video')
  async sendVideoStatus(
    @Body() body: { videoUrl: string; caption?: string },
  ) {
    if (!body.videoUrl) {
      throw new HttpException(
        'Le champ "videoUrl" est requis',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.whatsappService.sendVideoStatus(body.videoUrl, body.caption);
      return {
        success: true,
        message: 'Statut vidéo publié',
      };
    } catch (error) {
      throw new HttpException(
        getErrorMessage(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
 * ✅ Envoyer notification de nouvelle commande
 */
@Post('notify-order/:orderId')
@Roles(Role.ADMIN, Role.SUPER)
async notifyOrder(@Param('orderId') orderId: string) {
  await this.whatsappService.sendOrderNotification(orderId);
  return { 
    message: 'Notification de commande envoyée avec succès',
    orderId 
  };
}

/**
 * ✅ Notifier le client d'un changement de statut
 */
@Post('notify-status/:orderId')
@Roles(Role.ADMIN, Role.SUPER)
async notifyStatus(
  @Param('orderId') orderId: string,
  @Body('status') status: string,
) {
  await this.whatsappService.sendOrderStatusUpdate(orderId, status);
  return { 
    message: 'Notification de statut envoyée au client',
    orderId,
    status 
  };
}

    /**
     * DELETE /whatsapp/disconnect
     * Déconnecter WhatsApp
     */
    @Delete('disconnect')
    async disconnect() {
      try {
        await this.whatsappService.disconnect();
        return { success: true, message: 'Déconnecté avec succès' };
      } catch (error) {
        throw new HttpException(
          getErrorMessage(error),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }