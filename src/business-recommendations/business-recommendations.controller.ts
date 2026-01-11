// src/business-recommendations/business-recommendations.controller.ts

import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BusinessRecommendationsService } from './business-recommendations.service';

@ApiTags('Business Recommendations')
@Controller('business-recommendations')
export class BusinessRecommendationsController {
  constructor(private readonly service: BusinessRecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les recommandations' })
  findAll(@Query() filters: any) {
    return this.service.findAll(filters);
  }

  @Get('generate')
  @ApiOperation({ summary: 'Générer des recommandations manuellement' })
  generate() {
    return this.service.generateRecommendations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une recommandation' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/dismiss')
  @ApiOperation({ summary: 'Ignorer une recommandation' })
  dismiss(@Param('id') id: string) {
    return this.service.dismiss(id);
  }

  @Patch(':id/implement')
  @ApiOperation({ summary: 'Marquer comme implémentée' })
  implement(@Param('id') id: string, @Body() body: { feedback?: string }) {
    return this.service.markAsImplemented(id, body.feedback);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une recommandation' })
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.service.update(id, updateDto);
  }
}
