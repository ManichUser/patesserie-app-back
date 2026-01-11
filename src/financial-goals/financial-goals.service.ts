// src/financial-goals/financial-goals.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class FinancialGoalsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: any) {
    return this.prisma.financialGoal.create({
      data: {
        ...createDto,
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
      },
    });
  }

  async findAll(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.financialGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const goal = await this.prisma.financialGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException(`Objectif #${id} non trouvé`);
    return goal;
  }

  async update(id: string, updateDto: any) {
    await this.findOne(id);
    return this.prisma.financialGoal.update({
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
    return this.prisma.financialGoal.delete({ where: { id } });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateGoalsProgress() {
    const activeGoals = await this.prisma.financialGoal.findMany({
      where: { isActive: true },
    });

    for (const goal of activeGoals) {
      const now = new Date();
      if (now < new Date(goal.startDate) || now > new Date(goal.endDate)) {
        continue;
      }

      let currentValue = 0;

      const where: any = {
        createdAt: {
          gte: new Date(goal.startDate),
          lte: new Date(goal.endDate),
        },
      };

      if (goal.type === 'REVENUE') {
        const sales = await this.prisma.sale.aggregate({
          where,
          _sum: { actualPrice: true },
        });
        currentValue = sales._sum.actualPrice || 0;
      } else if (goal.type === 'PROFIT') {
        const sales = await this.prisma.sale.aggregate({
          where,
          _sum: { grossProfit: true },
        });
        currentValue = sales._sum.grossProfit || 0;
      } else if (goal.type === 'ORDERS') {
        currentValue = await this.prisma.order.count({
          where: {
            ...where,
            status: { not: 'CANCELLED' },
          },
        });
      }

      await this.prisma.financialGoal.update({
        where: { id: goal.id },
        data: { currentValue },
      });
    }
  }

  async getProgress(id: string) {
    const goal = await this.findOne(id);
    const percentage = goal.targetValue > 0 
      ? (goal.currentValue / goal.targetValue) * 100 
      : 0;

    return {
      ...goal,
      percentage: Math.min(percentage, 100),
      remaining: Math.max(goal.targetValue - goal.currentValue, 0),
      isCompleted: goal.currentValue >= goal.targetValue,
    };
  }
}
