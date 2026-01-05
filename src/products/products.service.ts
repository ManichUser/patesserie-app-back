import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: dto,
      include: {
        images: true,
      },
    });
  }

  async findAll(params?: { category?: string; available?: boolean }) {
    return this.prisma.product.findMany({
      where: {
        category: params?.category,
        available: params?.available,
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { favorites: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { favorites: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // Verified existence

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        images: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  async getMostLiked(limit: number = 10) {
    return this.prisma.product.findMany({
      include: {
        images: {
          where: { isFeatured: true },
          take: 1,
        },
        _count: {
          select: { favorites: true },
        },
      },
      orderBy: {
        favorites: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  async incrementLikes(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });
  }
}
