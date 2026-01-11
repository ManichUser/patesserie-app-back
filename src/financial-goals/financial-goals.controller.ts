// src/financial-goals/financial-goals.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FinancialGoalsService } from './financial-goals.service';

@ApiTags('Financial Goals')
@Controller('financial-goals')
export class FinancialGoalsController {
  constructor(private readonly service: FinancialGoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un objectif financier' })
  create(@Body() createDto: any) {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les objectifs' })
  findAll(@Query('isActive') isActive?: boolean) {
    return this.service.findAll(isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un objectif' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Progression de l\'objectif' })
  getProgress(@Param('id') id: string) {
    return this.service.getProgress(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un objectif' })
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un objectif' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}