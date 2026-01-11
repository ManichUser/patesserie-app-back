// src/special-offers/special-offers.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SpecialOffersService } from './special-offers.service';

@ApiTags('Special Offers')
@Controller('special-offers')
export class SpecialOffersController {
  constructor(private readonly service: SpecialOffersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une offre spéciale' })
  create(@Body() createDto: any) {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les offres' })
  findAll(@Query() filters: any) {
    return this.service.findAll(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer les offres actives' })
  findActive() {
    return this.service.findActive();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des offres' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une offre' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Appliquer une offre' })
  apply(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.service.applyOffer(id, body.userId);
  }

  @Post(':id/calculate')
  @ApiOperation({ summary: 'Calculer la réduction' })
  calculate(@Param('id') id: string, @Body() body: { cartTotal: number }) {
    return this.service.calculateDiscount(id, body.cartTotal);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une offre' })
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une offre' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
