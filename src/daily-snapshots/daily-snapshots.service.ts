// src/daily-snapshots/daily-snapshots.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DailySnapshotsService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailySnapshot() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    console.log(`📊 Génération du snapshot pour ${yesterday.toISOString().split('T')[0]}`);

    // Ventes du jour
    const salesData = await this.prisma.sale.aggregate({
      where: {
        saleDate: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: {
        actualPrice: true,
        grossProfit: true,
        costPrice: true,
      },
      _count: true,
      _avg: {
        profitMargin: true,
      },
    });

    const totalRevenue = salesData._sum.actualPrice || 0;
    const totalOrders = salesData._count || 0;
    const totalProfit = salesData._sum.grossProfit || 0;
    const totalCost = salesData._sum.costPrice || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMargin = salesData._avg.profitMargin || 0;

    // Dépenses du jour
    const expensesData = await this.prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalExpenses = expensesData._sum.amount || 0;

    // Nouveaux clients
    const newCustomers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // Clients récurrents (qui ont commandé ce jour)
    const returningCustomers = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
        user: {
          totalOrders: { gt: 1 },
        },
      },
    });

    // Produits en stock faible
    const lowStockProducts = await this.prisma.product.count({
      where: {
        stock: { lte: this.prisma.product.fields.lowStockThreshold },
        available: true,
      },
    });

    // Produit le plus vendu
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
      include: {
        items: true,
      },
    });

    const productSales: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      });
    });

    const topSellingProductId = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    // Taux de conversion (commandes / visiteurs)
    const totalViews = await this.prisma.productView.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

    // Créer ou mettre à jour le snapshot
    const existingSnapshot = await this.prisma.dailySnapshot.findUnique({
      where: { date: yesterday },
    });

    if (existingSnapshot) {
      return this.prisma.dailySnapshot.update({
        where: { date: yesterday },
        data: {
          totalRevenue,
          totalOrders,
          totalProfit,
          averageOrderValue,
          totalExpenses,
          totalCost,
          newCustomers,
          returningCustomers,
          topSellingProductId,
          lowStockProducts,
          conversionRate,
          profitMargin,
        },
      });
    } else {
      return this.prisma.dailySnapshot.create({
        data: {
          date: yesterday,
          totalRevenue,
          totalOrders,
          totalProfit,
          averageOrderValue,
          totalExpenses,
          totalCost,
          newCustomers,
          returningCustomers,
          topSellingProductId,
          lowStockProducts,
          conversionRate,
          profitMargin,
        },
      });
    }
  }

  async getSnapshots(startDate?: Date, endDate?: Date, limit: number = 30) {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.dailySnapshot.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async getSnapshot(date: Date) {
    return this.prisma.dailySnapshot.findUnique({
      where: { date },
    });
  }

  async getComparison(date: Date, compareWith: 'yesterday' | 'lastWeek' | 'lastMonth') {
    const snapshot = await this.getSnapshot(date);

    if (!snapshot) {
      throw new Error('Snapshot non trouvé pour cette date');
    }

    let compareDate = new Date(date);

    if (compareWith === 'yesterday') {
      compareDate.setDate(compareDate.getDate() - 1);
    } else if (compareWith === 'lastWeek') {
      compareDate.setDate(compareDate.getDate() - 7);
    } else {
      compareDate.setMonth(compareDate.getMonth() - 1);
    }

    const compareSnapshot = await this.getSnapshot(compareDate);

    if (!compareSnapshot) {
      return {
        current: snapshot,
        comparison: null,
        changes: null,
      };
    }

    const changes = {
      revenue: this.calculatePercentageChange(
        compareSnapshot.totalRevenue,
        snapshot.totalRevenue,
      ),
      orders: this.calculatePercentageChange(
        compareSnapshot.totalOrders,
        snapshot.totalOrders,
      ),
      profit: this.calculatePercentageChange(
        compareSnapshot.totalProfit,
        snapshot.totalProfit,
      ),
      expenses: this.calculatePercentageChange(
        compareSnapshot.totalExpenses,
        snapshot.totalExpenses,
      ),
      conversionRate: this.calculatePercentageChange(
        compareSnapshot.conversionRate,
        snapshot.conversionRate,
      ),
    };

    return {
      current: snapshot,
      comparison: compareSnapshot,
      changes,
    };
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  async getTrend(metric: string, days: number = 30) {
    const snapshots = await this.getSnapshots(
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      new Date(),
      days,
    );

    return snapshots.map(snapshot => ({
      date: snapshot.date,
      value: (snapshot as any)[metric],
    }));
  }
}

