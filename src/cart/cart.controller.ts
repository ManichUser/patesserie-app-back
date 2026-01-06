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
  } from '@nestjs/common';
  import { CartService } from './cart.service';
  import { AddToCartDto } from './dto/add-to-cart.dto';
  import { UpdateCartItemDto } from './dto/update-cart-item.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  import { Public } from '../auth/decorators/public.decorator';
  
  @Controller('cart')
  @UseGuards(JwtAuthGuard)
  export class CartController {
    constructor(private cartService: CartService) {}
  
    @Get()
    @Public()
    getCart(@CurrentUser() user: any, @Query('cartId') cartId?: string) {
      return this.cartService.getOrCreateCart(user?.id, cartId);
    }
  
    @Post('items')
    @Public()
    addItem(
      @CurrentUser() user: any,
      @Query('cartId') cartId: string,
      @Body() dto: AddToCartDto,
    ) {
      return this.cartService.addItem(user?.id, cartId, dto);
    }
  
    @Patch('items/:id')
    updateItem(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
      return this.cartService.updateItem(id, dto);
    }
  
    @Delete('items/:id')
    removeItem(@Param('id') id: string) {
      return this.cartService.removeItem(id);
    }
  
    @Delete(':id/clear')
    clearCart(@Param('id') id: string) {
      return this.cartService.clearCart(id);
    }
  
    @Get('user/all')
    getUserCarts(@CurrentUser() user: any) {
      return this.cartService.getUserCarts(user.id);
    }
  
    @Post(':id/save')
    saveCart(@Param('id') id: string, @Body('name') name: string) {
      return this.cartService.saveCart(id, name);
    }
  
    @Post('merge')
    mergeCarts(@CurrentUser() user: any, @Body('tempCartId') tempCartId: string) {
      return this.cartService.mergeCarts(user.id, tempCartId);
    }
  }