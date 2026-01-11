// src/favorites/favorites.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Toggle favorite (ajouter ou retirer)
   */
  async toggle(userId: string, productId: string) {
    // Vérifier que le produit existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      // Retirer des favoris
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });

      // Décrémenter le compteur de likes
      await this.prisma.product.update({
        where: { id: productId },
        data: { likes: { decrement: 1 } },
      });

      return { message: 'Retiré des favoris', isFavorite: false };
    } else {
      // Ajouter aux favoris
      await this.prisma.favorite.create({
        data: {
          userId,
          productId,
        },
      });

      // Incrémenter le compteur de likes
      await this.prisma.product.update({
        where: { id: productId },
        data: { likes: { increment: 1 } },
      });

      return { message: 'Ajouté aux favoris', isFavorite: true };
    }
  }

  /**
   * Récupérer tous les favoris d'un utilisateur
   */
  async getUserFavorites(userId: string, page: number = 1, limit: number = 20) {
    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: true, // ✅ Ajouté
              media: {
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      data: favorites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Vérifier si un produit est en favori
   */
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

  /**
   * Vérifier plusieurs produits à la fois
   */
  async checkMultipleFavorites(userId: string, productIds: string[]) {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });

    const favoriteIds = new Set(favorites.map(f => f.productId));

    return productIds.map(id => ({
      productId: id,
      isFavorite: favoriteIds.has(id),
    }));
  }

  /**
   * Récupérer les produits les plus favoris (statistiques admin)
   */
  async getMostFavorited(limit: number = 10) {
    return this.prisma.product.findMany({
      where: { available: true },
      include: {
        category: true, // ✅ Ajouté
        media: {
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

  /**
   * Supprimer tous les favoris d'un utilisateur
   */
  async clearAllFavorites(userId: string) {
    // Récupérer les IDs des produits favoris pour décrémenter les likes
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    });

    // Décrémenter les likes de tous les produits
    for (const favorite of favorites) {
      await this.prisma.product.update({
        where: { id: favorite.productId },
        data: { likes: { decrement: 1 } },
      });
    }

    // Supprimer les favoris
    await this.prisma.favorite.deleteMany({
      where: { userId },
    });

    return { message: 'Tous les favoris ont été supprimés' };
  }

  /**
   * Obtenir les statistiques des favoris d'un utilisateur
   */
  async getUserFavoritesStats(userId: string) {
    const [total, byCategory] = await Promise.all([
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.favorite.groupBy({
        by: ['productId'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      total,
      totalProducts: byCategory.length,
    };
  }
}

