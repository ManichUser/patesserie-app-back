import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseBoolPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
  } from '@nestjs/swagger';
  import { CategoriesService } from './categories.service';
  import { CreateCategoryDto } from './dto/create-category.dto';
  import { UpdateCategoryDto } from './dto/update-category.dto';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from 'src/generated/prisma/client';
  
  @ApiTags('Categories')
  @Controller('categories')
  export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}
  
    // ==================== PUBLIC ROUTES ====================
  
    @Get()
    @ApiOperation({ summary: 'Récupérer toutes les catégories' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'includeProducts', required: false, type: Boolean })
    @ApiQuery({
      name: 'orderBy',
      required: false,
      enum: ['order', 'name', 'createdAt'],
    })
    @ApiResponse({ status: 200, description: 'Liste des catégories' })
    findAll(
      @Query('isActive') isActive?: string,
      @Query('includeProducts', new ParseBoolPipe({ optional: true }))
      includeProducts?: boolean,
      @Query('orderBy') orderBy?: 'order' | 'name' | 'createdAt',
    ) {
      return this.categoriesService.findAll({
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        includeProducts,
        orderBy,
      });
    }
  
    @Get('stats')
    @ApiOperation({ summary: 'Statistiques des catégories' })
    @ApiResponse({ status: 200, description: 'Statistiques' })
    getStats() {
      return this.categoriesService.getStats();
    }
  
    @Get('slug/:slug')
    @ApiOperation({ summary: 'Récupérer une catégorie par slug' })
    @ApiQuery({ name: 'includeProducts', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Catégorie trouvée' })
    @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
    findBySlug(
      @Param('slug') slug: string,
      @Query('includeProducts', new ParseBoolPipe({ optional: true }))
      includeProducts?: boolean,
    ) {
      return this.categoriesService.findBySlug(slug, includeProducts);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une catégorie par ID' })
    @ApiQuery({ name: 'includeProducts', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Catégorie trouvée' })
    @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
    findOne(
      @Param('id') id: string,
      @Query('includeProducts', new ParseBoolPipe({ optional: true }))
      includeProducts?: boolean,
    ) {
      return this.categoriesService.findOne(id, includeProducts);
    }
  
    // ==================== ADMIN ROUTES ====================
   
  
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER)
    // @ApiBearerAuth()
    @ApiOperation({ summary: 'Créer une catégorie (Admin)' })
    @ApiResponse({ status: 201, description: 'Catégorie créée' })
    @ApiResponse({ status: 409, description: 'Catégorie déjà existante' })
    create(@Body() createCategoryDto: CreateCategoryDto) {
      return this.categoriesService.create(createCategoryDto);
    }
  
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER)
    // @ApiBearerAuth()
    @ApiOperation({ summary: 'Mettre à jour une catégorie (Admin)' })
    @ApiResponse({ status: 200, description: 'Catégorie mise à jour' })
    @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
      return this.categoriesService.update(id, updateCategoryDto);
    }
  
    @Patch(':id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER)
    // @ApiBearerAuth()
    @ApiOperation({ summary: 'Activer/Désactiver une catégorie (Admin)' })
    @ApiResponse({ status: 200, description: 'Statut mis à jour' })
    toggleActive(@Param('id') id: string) {
      return this.categoriesService.toggleActive(id);
    }
  
    @Post('reorder')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER)
    // @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Réorganiser les catégories (Admin)' })
    @ApiResponse({ status: 200, description: 'Catégories réorganisées' })
    reorder(@Body('categoryIds') categoryIds: string[]) {
      return this.categoriesService.reorder(categoryIds);
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPER)
    // @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Supprimer une catégorie (Admin)' })
    @ApiResponse({ status: 204, description: 'Catégorie supprimée' })
    @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
    @ApiResponse({
      status: 400,
      description: 'Impossible de supprimer (produits associés)',
    })
    remove(@Param('id') id: string) {
      return this.categoriesService.remove(id);
    }
  }