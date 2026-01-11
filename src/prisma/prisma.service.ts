import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Role } from 'src/generated/prisma/enums';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.seedSuperAdmin();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  
  // Seed Super Admin
  private async seedSuperAdmin() {
    const email = process.env.SUPER_USER_EMAIL || 'super@admin.com';
    const password = process.env.SUPER_USER_PASSWORD || 'Super123!';

    // Vérifie si le SUPER existe déjà
    const existing = await this.user.findFirst({
      where: { role: Role.SUPER },
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const superUser = await this.user.create({
        data: {
          name: 'Super Admin',
          email,
          phone: '0000000000',
          password: hashedPassword,
          role: Role.SUPER,
        },
      });

      this.logger.log(`✅ Super Admin créé : ${superUser.email}`);

    } else {
      this.logger.log('Super Admin déjà existant');
    }
  }
}
