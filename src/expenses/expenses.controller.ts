// src/expenses/expenses.controller.ts

import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
  import { ExpensesService } from './expenses.service';
  import { CreateExpenseDto } from './dto/create-expense.dto';
  import {UpdateExpenseDto} from './dto/update-expense.dto';
  import {ExpenseFilterDto} from './dto/expense-filter.dto';
  
  @ApiTags('Expenses')
  @Controller('expenses')
  export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}
  
    @Post()
    @ApiOperation({ summary: 'Créer une dépense' })
    create(@Body() createExpenseDto: CreateExpenseDto) {
      return this.expensesService.create(createExpenseDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Récupérer toutes les dépenses' })
    findAll(@Query() filters: ExpenseFilterDto) {
      return this.expensesService.findAll(filters);
    }
  
    @Get('stats')
    @ApiOperation({ summary: 'Statistiques des dépenses' })
    getStats(
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ) {
      return this.expensesService.getStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
    }
  
    @Get('trend')
    @ApiOperation({ summary: 'Évolution des dépenses' })
    getTrend(
      @Query('period') period: 'day' | 'week' | 'month' = 'day',
      @Query('limit') limit?: number,
    ) {
      return this.expensesService.getTrend(period, limit || 30);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une dépense' })
    findOne(@Param('id') id: string) {
      return this.expensesService.findOne(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Mettre à jour une dépense' })
    update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
      return this.expensesService.update(id, updateExpenseDto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Supprimer une dépense' })
    remove(@Param('id') id: string) {
      return this.expensesService.remove(id);
    }
  }
