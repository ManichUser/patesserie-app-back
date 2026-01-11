// src/special-offers/special-offers.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SpecialOffersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: any) {
    // Vérifier que les produits existent
    if (createDto.productIds && createDto.productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: createDto.productIds } },
      });

      if (products.length !== createDto.productIds.length) {
        throw new BadRequestException('Certains produits n\'existent pas');
      }
    }

    return this.prisma.specialOffer.create({
      data: {
        ...createDto,
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
      },
    });
  }

  async findAll(filters?: any) {
    const { isActive, type } = filters || {};
    const where: any = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (type) where.type = type;

    return this.prisma.specialOffer.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { startDate: 'desc' },
      ],
    });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.specialOffer.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { priority: 'desc' },
    });
  }

  async findOne(id: string) {
    const offer = await this.prisma.specialOffer.findUnique({
      where: { id },
    });

    if (!offer) {
      throw new NotFoundException(`Offre spéciale #${id} non trouvée`);
    }

    // Récupérer les produits concernés
    const products = await this.prisma.product.findMany({
      where: { id: { in: offer.productIds } },
    });

    return { ...offer, products };
  }

  async update(id: string, updateDto: any) {
    await this.findOne(id);
    return this.prisma.specialOffer.update({
      where: { id },
      data: {
        ...updateDto,
        startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.specialOffer.delete({ where: { id } });
  }

  async applyOffer(offerId: string, userId: string) {
    const offer = await this.findOne(offerId);
    const now = new Date();

    // Vérifications
    if (!offer.isActive) {
      throw new BadRequestException('Cette offre n\'est pas active');
    }

    if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) {
      throw new BadRequestException('Cette offre n\'est pas valide actuellement');
    }

    if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
      throw new BadRequestException('Cette offre a atteint sa limite d\'utilisation');
    }

    // Vérifier limite par utilisateur
    if (offer.limitPerUser) {
      // TODO: Implémenter le comptage par utilisateur
    }

    // Incrémenter le compteur d'utilisation
    await this.prisma.specialOffer.update({
      where: { id: offerId },
      data: { usageCount: { increment: 1 } },
    });

    return offer;
  }

  async calculateDiscount(offerId: string, cartTotal: number) {
    const offer = await this.findOne(offerId);

    if (offer.minPurchase && cartTotal < offer.minPurchase) {
      return {
        applicable: false,
        reason: `Montant minimum requis: $${offer.minPurchase}`,
        discount: 0,
      };
    }

    let discount = 0;

    if (offer.discountType === 'PERCENTAGE') {
      discount = (cartTotal * offer.discountValue) / 100;
    } else {
      discount = offer.discountValue;
    }

    if (offer.maxDiscount && discount > offer.maxDiscount) {
      discount = offer.maxDiscount;
    }

    return {
      applicable: true,
      discount,
      finalAmount: cartTotal - discount,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async deactivateExpiredOffers() {
    const now = new Date();
    
    await this.prisma.specialOffer.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
      data: { isActive: false },
    });
  }

  async getStats() {
    const [total, active, byType, topUsed] = await Promise.all([
      this.prisma.specialOffer.count(),
      this.prisma.specialOffer.count({ where: { isActive: true } }),
      this.prisma.specialOffer.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.specialOffer.findMany({
        orderBy: { usageCount: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total,
      active,
      byType,
      topUsed,
    };
  }
}


