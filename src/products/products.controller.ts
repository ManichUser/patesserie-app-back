import { Controller, Get, Post, Body, Patch, Param, Delete, Query,UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from 'src/generated/prisma/enums';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
    constructor(private productsService: ProductsService) {}

    @Post()
    @Roles(Role.ADMIN)
    create(@Body() dto: CreateProductDto) {
      return this.productsService.create(dto);
    }
  
    @Get()
    @Public()
    findAll(@Query('category') category?: string, @Query('available') available?: string) {
      return this.productsService.findAll({
        category,
        available: available === 'true',
      });
    }
  
    @Get('most-liked')
    @Public()
    getMostLiked(@Query('limit') limit?: string) {
      return this.productsService.getMostLiked(limit ? parseInt(limit) : 10);
    }
  
    @Get(':id')
    @Public()
    findOne(@Param('id') id: string) {
      return this.productsService.findOne(id);
    }
  
    @Patch(':id')
    @Roles(Role.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
      return this.productsService.update(id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id') id: string) {
      return this.productsService.remove(id);
    }
  
    @Post(':id/like')
    @Public()
    like(@Param('id') id: string) {
      return this.productsService.incrementLikes(id);
    }
  }