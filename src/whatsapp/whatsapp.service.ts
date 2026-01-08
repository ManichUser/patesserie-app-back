// src/whatsapp/whatsapp.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import makeWASocket, { 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  useMultiFileAuthState,
  Browsers,
  WASocket,
  delay
} from 'baileys';
import P from 'pino';
import path from 'path';
import fs from 'fs-extra';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private authFolder = path.join(process.cwd(), 'whatsapp-auth');
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private currentPhoneNumber: string | null = null;
  private isInitializing = false;

  async onModuleInit() {
    await this.tryAutoReconnect();
  }

  private async tryAutoReconnect() {
    try {
      const { state } = await useMultiFileAuthState(this.authFolder);
      
      if (state.creds.registered) {
        this.logger.log('🔄 Reconnexion automatique à WhatsApp...');
        await this.initSocket();
      } else {
        this.logger.log('ℹ️ Aucune session WhatsApp trouvée. Connexion manuelle requise.');
      }
    } catch (error) {
      this.logger.warn('⚠️ Impossible de reconnecter automatiquement');
    }
  }

  private async cleanAuthFolder() {
    try {
      if (await fs.pathExists(this.authFolder)) {
        await fs.remove(this.authFolder);
        this.logger.log('🧹 Dossier d\'authentification nettoyé');
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors du nettoyage:', error);
    }
  }

  private async initSocket() {
    if (this.isInitializing) {
      this.logger.warn('⚠️ Initialisation déjà en cours...');
      return;
    }

    this.isInitializing = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }) as any,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        auth: state,
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        this.logger.debug(`Connection update: ${connection}`);

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          this.logger.warn(`❌ WhatsApp déconnecté (code: ${statusCode})`);
          this.connectionStatus = 'disconnected';
          this.isInitializing = false;

          if (statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
            this.logger.error('🚫 Session invalide - Nettoyage...');
            await this.cleanAuthFolder();
          } else if (statusCode === DisconnectReason.restartRequired) {
            this.logger.log('🔄 Redémarrage...');
            setTimeout(() => this.initSocket(), 1000);
          } else if (shouldReconnect) {
            this.logger.log('🔄 Reconnexion dans 5s...');
            setTimeout(() => this.initSocket(), 5000);
          }
        } else if (connection === 'open') {
          this.logger.log('✅ WhatsApp connecté !');
          this.connectionStatus = 'connected';
          this.isInitializing = false;
        } else if (connection === 'connecting') {
          this.logger.log('🔗 Connexion en cours...');
          this.connectionStatus = 'connecting';
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.key.fromMe && m.type === 'notify') {
          const text = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text || '';
          this.logger.log(`📨 Message de ${message.key.remoteJid}: ${text}`);
        }
      });

    } catch (error) {
      this.logger.error('❌ Erreur initialisation:', error);
      this.connectionStatus = 'disconnected';
      this.isInitializing = false;
      throw error;
    }
  }

  async connect(phoneNumber: string): Promise<string> {
    if (this.connectionStatus === 'connected') {
      throw new Error('WhatsApp déjà connecté');
    }

    if (this.isInitializing) {
      throw new Error('Connexion déjà en cours');
    }

    this.logger.log(`📱 Connexion pour: ${phoneNumber}`);
    this.currentPhoneNumber = phoneNumber;

    await this.initSocket();

    let attempts = 0;
    while (!this.sock && attempts < 30) {
      await delay(500);
      attempts++;
    }

    if (!this.sock) {
      throw new Error('Socket non initialisé');
    }

    if (this.sock.authState.creds.registered) {
      this.logger.log('ℹ️ Session existante');
      return '';
    }

    this.logger.log('⏳ Stabilisation (3s)...');
    await delay(3000);

    let retries = 3;
    while (retries > 0) {
      try {
        this.logger.log(`🔑 Tentative ${4 - retries}/3...`);
        const code = await this.sock.requestPairingCode(phoneNumber);
        this.logger.log(`🔐 Code: ${code}`);
        return code;
      } catch (error) {
        retries--;
        if (retries === 0) {
          this.logger.error('❌ Échec après 3 tentatives:', error);
          throw new Error('Impossible de générer le code. Réessayez dans 30 secondes.');
        }
        this.logger.warn(`⚠️ Erreur, retry dans 2s... (${retries} restants)`);
        await delay(2000);
      }
    }

    throw new Error('Échec génération pairing code');
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      phoneNumber: this.currentPhoneNumber,
      isConnected: this.connectionStatus === 'connected',
    };
  }

  async sendMessage(to: string, message: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    
    await this.sock.sendMessage(jid, { text: message });
    this.logger.log(`✉️ Envoyé à ${to}`);
  }

  /**
   * ✅ Envoyer un message à plusieurs destinataires
   */
  async sendBulkMessage(recipients: string[], message: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      details: [] as Array<{ recipient: string; status: 'sent' | 'failed'; error?: string }>,
    };

    for (const recipient of recipients) {
      try {
        await this.sendMessage(recipient, message);
        results.sent++;
        results.details.push({ recipient, status: 'sent' });
        
        // Délai anti-spam (1 seconde entre chaque message)
        await delay(1000);
      } catch (error) {
        results.failed++;
        results.details.push({
          recipient,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
        this.logger.error(`❌ Échec envoi à ${recipient}:`, error);
      }
    }

    this.logger.log(`📊 Bulk: ${results.sent}/${results.total} envoyés, ${results.failed} échecs`);
    
    return results;
  }

  async sendImage(to: string, imageBuffer: Buffer, caption?: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    
    await this.sock.sendMessage(jid, {
      image: imageBuffer,
      caption: caption || '',
    });
    
    this.logger.log(`🖼️ Image envoyée à ${to}`);
  }

  /**
   * ✅ Envoyer une image depuis une URL
   */
  async sendImageFromUrl(to: string, imageUrl: string, caption?: string) {
    // Télécharger l'image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger l'image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    // Envoyer
    await this.sendImage(to, imageBuffer, caption);
  }
   /**
   * ✅ Envoyer un statut (story) texte
   */
   async sendTextStatus(message: string, options?: {
    backgroundColor?: string;
    font?: number;
  }) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      await this.sock.sendMessage('status@broadcast', {
        text: message,
      });

      this.logger.log(`📢 Statut texte publié`);
    } catch (error) {
      this.logger.error('❌ Erreur envoi statut texte:', error);
      throw error;
    }
  }




/**
 * ✅ Envoyer une vidéo depuis un Buffer
 */
async sendVideoFromBuffer(to: string, videoBuffer: Buffer, caption?: string) {
  if (this.connectionStatus !== 'connected' || !this.sock) {
    throw new Error('WhatsApp non connecté');
  }

  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  await this.sock.sendMessage(jid, {
    video: videoBuffer,
    caption: caption || '',
  });
  
  this.logger.log(`🎥 Vidéo envoyée à ${to}`);
}

/**
 * ✅ Envoyer une vidéo depuis une URL
 */
async sendVideoFromUrl(to: string, videoUrl: string, caption?: string) {
  // Télécharger la vidéo
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Impossible de télécharger la vidéo: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const videoBuffer = Buffer.from(arrayBuffer);
  
  // Envoyer
  await this.sendVideoFromBuffer(to, videoBuffer, caption);
}
  /**
   * ✅ Envoyer un statut image depuis une URL
   */
  async sendImageStatus(imageUrl: string, caption?: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      // Télécharger l'image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Impossible de télécharger l'image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Envoyer en tant que statut
      await this.sock.sendMessage('status@broadcast', {
        image: imageBuffer,
        caption: caption || '',
      });

      this.logger.log(`📢 Statut image publié`);
    } catch (error) {
      this.logger.error('❌ Erreur envoi statut image:', error);
      throw error;
    }
  }

  /**
   * ✅ Envoyer un statut image depuis un Buffer
   */
  async sendImageStatusFromBuffer(imageBuffer: Buffer, caption?: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      await this.sock.sendMessage('status@broadcast', {
        image: imageBuffer,
        caption: caption || '',
      });

      this.logger.log(`📢 Statut image publié`);
    } catch (error) {
      this.logger.error('❌ Erreur envoi statut image:', error);
      throw error;
    }
  }

  /**
   * ✅ Envoyer un statut vidéo depuis une URL
   */
  async sendVideoStatus(videoUrl: string, caption?: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      // Télécharger la vidéo
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Impossible de télécharger la vidéo: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);

      // Envoyer en tant que statut
      await this.sock.sendMessage('status@broadcast', {
        video: videoBuffer,
        caption: caption || '',
      });

      this.logger.log(`📢 Statut vidéo publié`);
    } catch (error) {
      this.logger.error('❌ Erreur envoi statut vidéo:', error);
      throw error;
    }
  }

  /**
   * ✅ Envoyer un statut vidéo depuis un Buffer
   */
  async sendVideoStatusFromBuffer(videoBuffer: Buffer, caption?: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp non connecté');
    }

    try {
      await this.sock.sendMessage('status@broadcast', {
        video: videoBuffer,
        caption: caption || '',
      });

      this.logger.log(`📢 Statut vidéo publié`);
    } catch (error) {
      this.logger.error('❌ Erreur envoi statut vidéo:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.connectionStatus = 'disconnected';
      this.currentPhoneNumber = null;
      this.sock = null;
      await this.cleanAuthFolder();
      this.logger.log('👋 Déconnecté');
    }
  }
}