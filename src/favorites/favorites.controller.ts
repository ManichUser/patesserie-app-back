import { Controller, Get, Post, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  // Toggle favorite
  @Post(':productId')
  toggle(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.favoritesService.toggle(user.id, productId);
  }

  // Récupérer mes favoris
  @Get()
  getUserFavorites(@CurrentUser() user: any) {
    return this.favoritesService.getUserFavorites(user.id);
  }

  // Vérifier si un produit est favori
  @Get(':productId')
  checkFavorite(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.favoritesService.checkFavorite(user.id, productId);
  }

  // Statistiques produits les plus favoris (ADMIN)
  @Get('stats/most-favorited')
  @Roles(Role.ADMIN, Role.SUPER)
  getMostFavorited(@Query('limit') limit?: string) {
    return this.favoritesService.getMostFavorited(limit ? parseInt(limit) : 10);
  }

  // Supprimer tous les favoris
  @Delete('clear')
  clearAllFavorites(@CurrentUser() user: any) {
    return this.favoritesService.clearAllFavorites(user.id);
  }
}

