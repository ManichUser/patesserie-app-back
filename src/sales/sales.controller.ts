// src/sales/sales.controller.ts

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
  import { SalesService } from './sales.service';
  import { CreateSaleDto } from './dto/create-sale.dto';
  import { UpdateSaleDto } from './dto/update-sale.dto';
  import { SaleFilterDto } from './dto/sale-filter.dto';
  
  @ApiTags('Sales')
  @Controller('sales')
  export class SalesController {
    constructor(private readonly salesService: SalesService) {}
  
    @Post()
    @ApiOperation({ summary: 'Créer une vente' })
    @ApiResponse({ status: 201, description: 'Vente créée avec succès' })
    create(@Body() createSaleDto: CreateSaleDto) {
      return this.salesService.create(createSaleDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Récupérer toutes les ventes' })
    @ApiResponse({ status: 200, description: 'Liste des ventes' })
    findAll(@Query() filters: SaleFilterDto) {
      return this.salesService.findAll(filters);
    }
  
    @Get('stats')
    @ApiOperation({ summary: 'Statistiques des ventes' })
    @ApiResponse({ status: 200, description: 'Statistiques' })
    getStats(
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ) {
      return this.salesService.getStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
    }
  
    @Get('top-products')
    @ApiOperation({ summary: 'Top produits vendus' })
    @ApiResponse({ status: 200, description: 'Top produits' })
    getTopProducts(
      @Query('limit') limit?: number,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ) {
      return this.salesService.getTopProducts(
        limit || 10,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
    }
  
    @Get('trend')
    @ApiOperation({ summary: 'Évolution des ventes' })
    @ApiResponse({ status: 200, description: 'Tendance des ventes' })
    getSalesTrend(
      @Query('period') period: 'day' | 'week' | 'month' = 'day',
      @Query('limit') limit?: number,
    ) {
      return this.salesService.getSalesTrend(period, limit || 30);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une vente' })
    @ApiResponse({ status: 200, description: 'Vente trouvée' })
    @ApiResponse({ status: 404, description: 'Vente non trouvée' })
    findOne(@Param('id') id: string) {
      return this.salesService.findOne(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Mettre à jour une vente' })
    @ApiResponse({ status: 200, description: 'Vente mise à jour' })
    update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
      return this.salesService.update(id, updateSaleDto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Supprimer une vente' })
    @ApiResponse({ status: 204, description: 'Vente supprimée' })
    remove(@Param('id') id: string) {
      return this.salesService.remove(id);
    }
  }