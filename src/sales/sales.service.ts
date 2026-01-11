// src/sales/sales.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleFilterDto } from './dto/sale-filter.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer une vente
   */
  async create(createSaleDto: CreateSaleDto) {
    // Vérifier que la commande existe
    const order = await this.prisma.order.findUnique({
      where: { id: createSaleDto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    // Vérifier qu'une vente n'existe pas déjà pour cette commande
    const existingSale = await this.prisma.sale.findUnique({
      where: { orderId: createSaleDto.orderId },
    });

    if (existingSale) {
      throw new BadRequestException('Une vente existe déjà pour cette commande');
    }

    // Calculer les marges
    const totalCosts = createSaleDto.costPrice + 
                      (createSaleDto.deliveryCost || 0) + 
                      (createSaleDto.otherCosts || 0);
    
    const grossProfit = createSaleDto.actualPrice - totalCosts;
    const profitMargin = createSaleDto.actualPrice > 0 
      ? (grossProfit / createSaleDto.actualPrice) * 100 
      : 0;

    return this.prisma.sale.create({
      data: {
        ...createSaleDto,
        grossProfit,
        profitMargin,
      },
      include: {
        order: {
          include: {
            items: true,
            user: true,
          },
        },
      },
    });
  }

  /**
   * Récupérer toutes les ventes avec filtres
   */
  async findAll(filters: SaleFilterDto) {
    const { startDate, endDate, wasNegotiated, paymentMethod, minPrice, maxPrice, page, limit } = filters;

    const where: any = {};

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    if (wasNegotiated !== undefined) {
      where.wasNegotiated = wasNegotiated;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.actualPrice = {};
      if (minPrice !== undefined) where.actualPrice.gte = minPrice;
      if (maxPrice !== undefined) where.actualPrice.lte = maxPrice;
    }

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              items: true,
            },
          },
        },
        orderBy: { saleDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer une vente par ID
   */
  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Vente #${id} non trouvée`);
    }

    return sale;
  }

  /**
   * Mettre à jour une vente
   */
  async update(id: string, updateSaleDto: UpdateSaleDto) {
    const sale = await this.findOne(id);

    // Recalculer les marges si nécessaire
    let grossProfit = sale.grossProfit;
    let profitMargin = sale.profitMargin;

    if (updateSaleDto.actualPrice !== undefined || 
        updateSaleDto.costPrice !== undefined || 
        updateSaleDto.deliveryCost !== undefined || 
        updateSaleDto.otherCosts !== undefined) {
      
      const actualPrice = updateSaleDto.actualPrice ?? sale.actualPrice;
      const costPrice = updateSaleDto.costPrice ?? sale.costPrice;
      const deliveryCost = updateSaleDto.deliveryCost ?? sale.deliveryCost;
      const otherCosts = updateSaleDto.otherCosts ?? sale.otherCosts;

      const totalCosts = costPrice + deliveryCost + otherCosts;
      grossProfit = actualPrice - totalCosts;
      profitMargin = actualPrice > 0 ? (grossProfit / actualPrice) * 100 : 0;
    }

    return this.prisma.sale.update({
      where: { id },
      data: {
        ...updateSaleDto,
        grossProfit,
        profitMargin,
      },
      include: {
        order: true,
      },
    });
  }

  /**
   * Supprimer une vente
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sale.delete({ where: { id } });
  }

  /**
   * Statistiques des ventes
   */
  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = startDate;
      if (endDate) where.saleDate.lte = endDate;
    }

    const [
      totalSales,
      aggregations,
      negotiatedSales,
      paymentMethods,
    ] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.aggregate({
        where,
        _sum: {
          actualPrice: true,
          grossProfit: true,
          costPrice: true,
        },
        _avg: {
          actualPrice: true,
          profitMargin: true,
        },
      }),
      this.prisma.sale.count({
        where: { ...where, wasNegotiated: true },
      }),
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where,
        _count: true,
        _sum: {
          actualPrice: true,
        },
      }),
    ]);

    return {
      totalSales,
      totalRevenue: aggregations._sum.actualPrice || 0,
      totalProfit: aggregations._sum.grossProfit || 0,
      totalCost: aggregations._sum.costPrice || 0,
      averageOrderValue: aggregations._avg.actualPrice || 0,
      averageProfitMargin: aggregations._avg.profitMargin || 0,
      negotiatedSales,
      negotiationRate: totalSales > 0 ? (negotiatedSales / totalSales) * 100 : 0,
      paymentMethods: paymentMethods.map(pm => ({
        method: pm.paymentMethod,
        count: pm._count,
        total: pm._sum.actualPrice || 0,
      })),
    };
  }

  /**
   * Top produits vendus
   */
  async getTopProducts(limit: number = 10, startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = startDate;
      if (endDate) where.saleDate.lte = endDate;
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Agréger les produits
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

    return Object.values(productStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Évolution des ventes par période
   */
  async getSalesTrend(period: 'day' | 'week' | 'month', limit: number = 30) {
    const sales = await this.prisma.sale.findMany({
      orderBy: { saleDate: 'desc' },
      take: limit * (period === 'day' ? 1 : period === 'week' ? 7 : 30),
    });

    // Grouper par période
    const grouped: Record<string, { revenue: number; profit: number; count: number }> = {};

    sales.forEach(sale => {
      const date = new Date(sale.saleDate);
      let key: string;

      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, profit: 0, count: 0 };
      }

      grouped[key].revenue += sale.actualPrice;
      grouped[key].profit += sale.grossProfit;
      grouped[key].count += 1;
    });

    return Object.entries(grouped)
      .map(([period, data]) => ({ period, ...data }))
      .slice(0, limit);
  }
}