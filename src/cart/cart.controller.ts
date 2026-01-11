// src/carts/carts.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { CartsService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SaveCartDto } from './dto/save-cart.dto';
import { MergeCartsDto } from './dto/merge-carts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Carts')
@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  // ============================================
  // 🛒 ENDPOINTS PANIER (PUBLIC + AUTH)
  // ============================================

  @Get()
  @Public()
  @ApiOperation({ summary: 'Récupérer ou créer un panier' })
  @ApiQuery({ name: 'cartId', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 200, description: 'Panier récupéré' })
  getCart(
    @CurrentUser() user: any,
    @Query('cartId') cartId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.cartsService.getOrCreateCart(user?.id, cartId, sessionId);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Récupérer mon panier actif' })
  @ApiResponse({ status: 200, description: 'Panier actif récupéré' })
  getActiveCart(@CurrentUser() user: any) {
    return this.cartsService.getActiveCart(user.id);
  }

  @Get('my-carts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mes paniers sauvegardés' })
  @ApiResponse({ status: 200, description: 'Liste des paniers' })
  getUserCarts(@CurrentUser() user: any) {
    return this.cartsService.getUserCarts(user.id);
  }

  @Get(':cartId/total')
  @Public()
  @ApiOperation({ summary: 'Calculer le total du panier' })
  @ApiResponse({ status: 200, description: 'Total calculé' })
  getCartTotal(@Param('cartId') cartId: string) {
    return this.cartsService.getCartTotal(cartId);
  }

  @Post('add')
  @Public()
  @ApiOperation({ summary: 'Ajouter un produit au panier' })
  @ApiQuery({ name: 'cartId', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 201, description: 'Produit ajouté au panier' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  @ApiResponse({ status: 400, description: 'Produit indisponible ou stock insuffisant' })
  addItem(
    @CurrentUser() user: any,
    @Query('cartId') cartId: string,
    @Query('sessionId') sessionId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartsService.addItem(user?.id, cartId, sessionId, dto);
  }

  @Patch('items/:itemId')
  @Public()
  @ApiOperation({ summary: 'Modifier un item du panier' })
  @ApiResponse({ status: 200, description: 'Item mis à jour' })
  @ApiResponse({ status: 404, description: 'Item non trouvé' })
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartsService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un item du panier' })
  @ApiResponse({ status: 204, description: 'Item supprimé' })
  @ApiResponse({ status: 404, description: 'Item non trouvé' })
  removeItem(@Param('itemId') itemId: string) {
    return this.cartsService.removeItem(itemId);
  }

  @Delete(':cartId/clear')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vider le panier' })
  @ApiResponse({ status: 204, description: 'Panier vidé' })
  clearCart(@Param('cartId') cartId: string) {
    return this.cartsService.clearCart(cartId);
  }

  // ============================================
  // 💾 SAUVEGARDE & FUSION (AUTH REQUIRED)
  // ============================================

  @Post(':cartId/save')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sauvegarder un panier avec un nom' })
  @ApiResponse({ status: 200, description: 'Panier sauvegardé' })
  saveCart(
    @CurrentUser() user: any,
    @Param('cartId') cartId: string,
    @Body() dto: SaveCartDto,
  ) {
    return this.cartsService.saveCart(cartId, dto.name, user.id);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fusionner panier temporaire avec mon panier' })
  @ApiResponse({ status: 200, description: 'Paniers fusionnés' })
  mergeCarts(@CurrentUser() user: any, @Body() dto: MergeCartsDto) {
    return this.cartsService.mergeCarts(user.id, dto.tempCartId);
  }

  // ============================================
  // 🗑️ MAINTENANCE (CRON)
  // ============================================

  @Delete('expired')
  @ApiOperation({ summary: 'Nettoyer les paniers expirés (CRON)' })
  @ApiResponse({ status: 200, description: 'Paniers expirés supprimés' })
  cleanExpiredCarts() {
    return this.cartsService.cleanExpiredCarts();
  }
}