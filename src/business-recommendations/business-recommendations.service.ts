// src/business-recommendations/business-recommendations.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
// import { RecommendationType, RecommendationPriority } from 'src/generated/prisma/client';

@Injectable()
export class BusinessRecommendationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: any) {
    const { type, priority, status, isDismissed } = filters || {};
    const where: any = {};

    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (isDismissed !== undefined) where.isDismissed = isDismissed;

    return this.prisma.businessRecommendation.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const rec = await this.prisma.businessRecommendation.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`Recommandation #${id} non trouvée`);
    return rec;
  }

  async update(id: string, updateDto: any) {
    await this.findOne(id);
    return this.prisma.businessRecommendation.update({
      where: { id },
      data: updateDto,
    });
  }

  async dismiss(id: string) {
    return this.update(id, { isDismissed: true });
  }

  async markAsImplemented(id: string, feedback?: string) {
    return this.update(id, {
      wasImplemented: true,
      implementedAt: new Date(),
      adminFeedback: feedback,
      status: 'IMPLEMENTED',
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateRecommendations() {
    console.log('🤖 Génération des recommandations automatiques...');

    // Recommandations basées sur les stocks faibles
    await this.generateLowStockRecommendations();

    // Recommandations basées sur les produits populaires
    await this.generatePopularProductsRecommendations();

    // Recommandations basées sur les marges
    await this.generateProfitMarginRecommendations();

    // Recommandations basées sur les clients inactifs
    await this.generateCustomerRetentionRecommendations();

    // Recommandations basées sur les dépenses élevées
    await this.generateCostReductionRecommendations();
  }

  private async generateLowStockRecommendations() {
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        stock: { lte: this.prisma.product.fields.lowStockThreshold },
        available: true,
      },
    });

    if (lowStockProducts.length > 0) {
      await this.prisma.businessRecommendation.create({
        data: {
          type: 'INVENTORY',
          priority: lowStockProducts.length > 5 ? 'URGENT' : 'HIGH',
          title: `${lowStockProducts.length} produit(s) en rupture de stock`,
          description: `Les produits suivants ont un stock faible : ${lowStockProducts.map(p => p.name).join(', ')}. Il est recommandé de réapprovisionner rapidement.`,
          metrics: {
            productsCount: lowStockProducts.length,
            products: lowStockProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock })),
          },
          suggestedActions: [
            'Contacter les fournisseurs',
            'Passer une commande de réapprovisionnement',
            'Mettre en place des alertes automatiques',
          ],
          estimatedImpact: 'Éviter les pertes de ventes potentielles',
        },
      });
    }
  }

  private async generatePopularProductsRecommendations() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: thirtyDaysAgo } },
      include: {
        order: {
          include: { items: { include: { product: true } } },
        },
      },
    });

    const productStats: Record<string, any> = {};

    sales.forEach(sale => {
      sale.order.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            product: item.product,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);

    if (topProducts.length > 0) {
      await this.prisma.businessRecommendation.create({
        data: {
          type: 'MARKETING',
          priority: 'MEDIUM',
          title: 'Promouvoir les produits populaires',
          description: `Vos produits les plus vendus ce mois : ${topProducts.map((p: any) => p.product.name).join(', ')}. Envisagez de créer des offres spéciales.`,
          metrics: { topProducts },
          suggestedActions: [
            'Créer une campagne marketing ciblée',
            'Offrir des réductions sur les achats groupés',
            'Mettre en avant ces produits sur les réseaux sociaux',
          ],
          estimatedImpact: 'Peut augmenter les ventes de 15-25%',
        },
      });
    }
  }

  private async generateProfitMarginRecommendations() {
    const sales = await this.prisma.sale.findMany({
      orderBy: { profitMargin: 'asc' },
      take: 10,
      include: { order: { include: { items: { include: { product: true } } } } },
    });

    const lowMarginSales = sales.filter(s => s.profitMargin < 20);

    if (lowMarginSales.length > 0) {
      await this.prisma.businessRecommendation.create({
        data: {
          type: 'PRICING',
          priority: 'HIGH',
          title: 'Marges bénéficiaires faibles détectées',
          description: `${lowMarginSales.length} ventes ont une marge inférieure à 20%. Considérez d'ajuster les prix ou de réduire les coûts.`,
          metrics: { lowMarginSales: lowMarginSales.length, averageMargin: sales.reduce((sum, s) => sum + s.profitMargin, 0) / sales.length },
          suggestedActions: [
            'Revoir la stratégie de tarification',
            'Négocier avec les fournisseurs',
            'Optimiser les coûts de production',
          ],
          estimatedImpact: 'Améliorer la rentabilité de 10-15%',
        },
      });
    }
  }

  private async generateCustomerRetentionRecommendations() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactiveCustomers = await this.prisma.user.count({
      where: {
        lastOrderDate: { lt: thirtyDaysAgo },
        totalOrders: { gt: 0 },
      },
    });

    if (inactiveCustomers > 10) {
      await this.prisma.businessRecommendation.create({
        data: {
          type: 'CUSTOMER_RETENTION',
          priority: 'MEDIUM',
          title: 'Clients inactifs détectés',
          description: `${inactiveCustomers} clients n'ont pas commandé depuis 30 jours. Lancez une campagne de réactivation.`,
          metrics: { inactiveCustomers },
          suggestedActions: [
            'Envoyer un email de réactivation avec code promo',
            'Créer une offre spéciale "We Miss You"',
            'Contacter via WhatsApp avec nouveautés',
          ],
          estimatedImpact: 'Récupérer 15-20% des clients inactifs',
        },
      });
    }
  }

  private async generateCostReductionRecommendations() {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const expenses = await this.prisma.expense.aggregate({
      where: { expenseDate: { gte: lastMonth } },
      _sum: { amount: true },
    });

    const sales = await this.prisma.sale.aggregate({
      where: { saleDate: { gte: lastMonth } },
      _sum: { actualPrice: true },
    });

    const expenseRatio = (expenses._sum.amount || 0) / (sales._sum.actualPrice || 1);

    if (expenseRatio > 0.4) {
      await this.prisma.businessRecommendation.create({
        data: {
          type: 'COST_REDUCTION',
          priority: 'HIGH',
          title: 'Dépenses élevées par rapport au CA',
          description: `Vos dépenses représentent ${(expenseRatio * 100).toFixed(1)}% du chiffre d'affaires. Cherchez des opportunités de réduction.`,
          metrics: { expenseRatio, totalExpenses: expenses._sum.amount, totalRevenue: sales._sum.actualPrice },
          suggestedActions: [
            'Analyser les dépenses récurrentes',
            'Renégocier avec les fournisseurs',
            'Optimiser les coûts de livraison',
          ],
          estimatedImpact: 'Réduire les coûts de 10-15%',
        },
      });
    }
  }
}
