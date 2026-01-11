// src/expenses/expenses.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        ...createExpenseDto,
        expenseDate: createExpenseDto.expenseDate 
          ? new Date(createExpenseDto.expenseDate) 
          : new Date(),
      },
    });
  }

  async findAll(filters: ExpenseFilterDto) {
    const { category, startDate, endDate, isRecurring, vendor, page, limit } = filters;

    const where: any = {};

    if (category) where.category = category;
    if (isRecurring !== undefined) where.isRecurring = isRecurring;
    if (vendor) where.vendor = { contains: vendor, mode: 'insensitive' };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException(`Dépense #${id} non trouvée`);
    }
    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...updateExpenseDto,
        expenseDate: updateExpenseDto.expenseDate 
          ? new Date(updateExpenseDto.expenseDate) 
          : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.expense.delete({ where: { id } });
  }

  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = startDate;
      if (endDate) where.expenseDate.lte = endDate;
    }

    const [totalExpenses, aggregations, byCategory, recurring] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { ...where, isRecurring: true },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalExpenses,
      totalAmount: aggregations._sum.amount || 0,
      averageAmount: aggregations._avg.amount || 0,
      recurringExpenses: recurring._count || 0,
      recurringAmount: recurring._sum.amount || 0,
      byCategory: byCategory.map(cat => ({
        category: cat.category,
        count: cat._count,
        total: cat._sum.amount || 0,
      })),
    };
  }

  async getTrend(period: 'day' | 'week' | 'month', limit: number = 30) {
    const expenses = await this.prisma.expense.findMany({
      orderBy: { expenseDate: 'desc' },
      take: limit * (period === 'day' ? 1 : period === 'week' ? 7 : 30),
    });

    const grouped: Record<string, { amount: number; count: number }> = {};

    expenses.forEach(expense => {
      const date = new Date(expense.expenseDate);
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
        grouped[key] = { amount: 0, count: 0 };
      }

      grouped[key].amount += expense.amount;
      grouped[key].count += 1;
    });

    return Object.entries(grouped)
      .map(([period, data]) => ({ period, ...data }))
      .slice(0, limit);
  }
}