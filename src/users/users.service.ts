// src/users/users.service.ts

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {Role} from 'src/generated/prisma/enums'
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer tous les utilisateurs (ADMIN)
   */
  async findAll(filters?: any) {
    const { role, search, page = 1, limit = 20 } = filters || {};

    const where: any = {};

    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          address: true,
          city: true,
          district: true,
          birthdate: true,
          gender: true,
          emailVerified: true,
          phoneVerified: true,
          totalOrders: true,
          totalSpent: true,
          lastOrderDate: true,
          loyaltyPoints: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              favorites: true,
              reviews: true,
              addresses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        address: true,
        city: true,
        district: true,
        birthdate: true,
        gender: true,
        emailVerified: true,
        phoneVerified: true,
        newsletter: true,
        smsNotifications: true,
        totalOrders: true,
        totalSpent: true,
        lastOrderDate: true,
        loyaltyPoints: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            favorites: true,
            reviews: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  async getProfile(userId: string) {
    return this.findOne(userId);
  }

  /**
   * Mettre à jour le profil
   */
  async updateProfile(userId: string, dto: UpdateUserDto) {
    // Vérifier que l'utilisateur existe
    await this.findOne(userId);

    // Si le téléphone ou l'email est modifié, vérifier qu'il n'est pas déjà utilisé
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: dto.phone,
          NOT: { id: userId },
        },
      });

      if (existingPhone) {
        throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        phone: dto.phone,
        avatar: dto.avatar,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
        gender: dto.gender,
        newsletter: dto.newsletter,
        smsNotifications: dto.smsNotifications,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        address: true,
        city: true,
        district: true,
        birthdate: true,
        gender: true,
        newsletter: true,
        smsNotifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  /**
   * Supprimer son compte
   */
  async deleteAccount(userId: string) {
    await this.findOne(userId);

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Compte supprimé avec succès' };
  }

  /**
   * Récupérer les statistiques d'un utilisateur
   */
  async getUserStats(userId: string) {
    const user = await this.findOne(userId);

    // Récupérer les commandes par statut
    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    // Transformer en objet clé-valeur
    const ordersCount: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    ordersByStatus.forEach(group => {
      ordersCount[group.status] = group._count;
    });

    // Nombre de favoris
    const favoritesCount = await this.prisma.favorite.count({
      where: { userId },
    });

    // Nombre de paniers actifs
    const cartsCount = await this.prisma.cart.count({
      where: {
        userId,
        status: { not: 'FINALIZED' },
      },
    });

    // Nombre d'avis
    const reviewsCount = await this.prisma.review.count({
      where: { userId },
    });

    // Nombre d'adresses
    const addressesCount = await this.prisma.address.count({
      where: { userId },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        loyaltyPoints: user.loyaltyPoints,
      },
      stats: {
        totalSpent: user.totalSpent,
        totalOrders: user.totalOrders,
        lastOrderDate: user.lastOrderDate,
        favoritesCount,
        cartsCount,
        reviewsCount,
        addressesCount,
        orders: ordersCount,
      },
    };
  }

  /**
   * ADMIN: Mettre à jour le rôle d'un utilisateur
   */
  async updateRole(userId: string, role: Role) {
    await this.findOne(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  /**
   * ADMIN: Supprimer un utilisateur
   */
  async deleteUser(userId: string) {
    await this.findOne(userId);

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  /**
   * ADMIN: Obtenir les statistiques globales des utilisateurs
   */
  async getGlobalStats() {
    const [
      totalUsers,
      usersByRole,
      totalSpent,
      totalOrders,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.aggregate({
        _sum: { totalSpent: true },
      }),
      this.prisma.user.aggregate({
        _sum: { totalOrders: true },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
          },
        },
      }),
    ]);

    const roleStats: Record<string, number> = {
      USER: 0,
      ADMIN: 0,
      SUPER: 0,
    };

    usersByRole.forEach(group => {
      roleStats[group.role] = group._count;
    });

    return {
      totalUsers,
      totalSpent: totalSpent._sum.totalSpent || 0,
      totalOrders: totalOrders._sum.totalOrders || 0,
      recentUsers,
      usersByRole: roleStats,
    };
  }

  /**
   * Vérifier l'email
   */
  async verifyEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  /**
   * Vérifier le téléphone
   */
  async verifyPhone(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });
  }
}