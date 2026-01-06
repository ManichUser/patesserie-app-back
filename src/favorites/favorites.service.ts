import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  // Toggle favorite (ajouter ou retirer)
  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { message: 'Removed from favorites', isFavorite: false };
    } else {
      await this.prisma.favorite.create({
        data: {
          userId,
          productId,
        },
      });
      return { message: 'Added to favorites', isFavorite: true };
    }
  }

  // Récupérer tous les favoris d'un utilisateur
  async getUserFavorites(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: {
              where: { isFeatured: true },
              take: 1,
            },
            _count: {
              select: { favorites: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Vérifier si un produit est en favori
  async checkFavorite(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { isFavorite: !!favorite };
  }

  // Récupérer les produits les plus favoris (statistiques admin)
  async getMostFavorited(limit: number = 10) {
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

  // Supprimer tous les favoris d'un utilisateur
  async clearAllFavorites(userId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId },
    });

    return { message: 'All favorites cleared' };
  }
}
