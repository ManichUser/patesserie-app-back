// src/categories/categories.service.ts 

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Génère un slug à partir du nom
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Créer une catégorie
   */
  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug, ...rest } = createCategoryDto;

    // Générer le slug si non fourni
    const finalSlug = slug || this.generateSlug(name);

    // Vérifier l'unicité du slug
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      throw new ConflictException(
        `Une catégorie avec le slug "${finalSlug}" existe déjà`,
      );
    }

    // Vérifier l'unicité du nom
    const existingName = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingName) {
      throw new ConflictException(
        `Une catégorie avec le nom "${name}" existe déjà`,
      );
    }

    return this.prisma.category.create({
      data: {
        name,
        slug: finalSlug,
        ...rest,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Récupérer toutes les catégories
   */
  async findAll(params?: {
    isActive?: boolean;
    includeProducts?: boolean;
    orderBy?: 'order' | 'name' | 'createdAt';
    page?: number;
    limit?: number;
  }) {
    const {
      isActive,
      includeProducts = false,
      orderBy = 'order',
      page = 1,
      limit = 50,
    } = params || {};

    const where = isActive !== undefined ? { isActive } : undefined;

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
          ...(includeProducts && {
            products: {
              where: { available: true },
              include: {
                media: {
                  where: { isFeatured: true },
                  take: 1,
                },
              },
              take: 10, // Limiter le nombre de produits retournés
            },
          }),
        },
        orderBy:
          orderBy === 'order'
            ? { order: 'asc' }
            : orderBy === 'name'
              ? { name: 'asc' }
              : { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer une catégorie par ID
   */
  async findOne(id: string, includeProducts = false) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        ...(includeProducts && {
          products: {
            where: { available: true },
            include: {
              media: {
                where: { isFeatured: true },
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        }),
      },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie #${id} introuvable`);
    }

    return category;
  }

  /**
   * Récupérer une catégorie par slug
   */
  async findBySlug(slug: string, includeProducts = false) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true },
        },
        ...(includeProducts && {
          products: {
            where: { available: true },
            include: {
              media: {
                where: { isFeatured: true },
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        }),
      },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie "${slug}" introuvable`);
    }

    return category;
  }

  /**
   * Mettre à jour une catégorie
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    const { name, slug, ...rest } = updateCategoryDto;

    // Si le nom change, vérifier l'unicité
    if (name) {
      const existing = await this.prisma.category.findFirst({
        where: {
          name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Une catégorie avec le nom "${name}" existe déjà`,
        );
      }
    }

    // Si le slug change, vérifier l'unicité
    if (slug) {
      const existing = await this.prisma.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Une catégorie avec le slug "${slug}" existe déjà`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(name && { name, slug: slug || this.generateSlug(name) }),
        ...rest,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Supprimer une catégorie
   */
  async remove(id: string, force: boolean = false) {
    await this.findOne(id);

    // Vérifier s'il y a des produits associés
    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0 && !force) {
      throw new BadRequestException(
        `Impossible de supprimer la catégorie car elle contient ${productsCount} produit(s). Utilisez force=true pour forcer la suppression.`,
      );
    }

    // Si force, mettre à jour les produits pour retirer la catégorie
    if (force && productsCount > 0) {
      await this.prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Activer/Désactiver une catégorie
   */
  async toggleActive(id: string) {
    const category = await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Réorganiser les catégories
   */
  async reorder(categoryIds: string[]) {
    const updates = categoryIds.map((id, index) =>
      this.prisma.category.update({
        where: { id },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { message: 'Catégories réorganisées avec succès' };
  }

  /**
   * Statistiques des catégories
   */
  async getStats() {
    const [total, active, withProducts] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.category.count({
        where: {
          products: {
            some: {},
          },
        },
      }),
    ]);

    const topCategories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    return {
      total,
      active,
      inactive: total - active,
      withProducts,
      empty: total - withProducts,
      topCategories,
    };
  }
}