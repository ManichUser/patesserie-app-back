import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Récupérer tous les utilisateurs (ADMIN)
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            carts: true,
            favorites: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Récupérer un utilisateur par ID
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            carts: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Récupérer le profil de l'utilisateur connecté
  async getProfile(userId: string) {
    return this.findOne(userId);
  }

  // Mettre à jour le profil
  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Changer le mot de passe
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  // Supprimer son compte
  async deleteAccount(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }

  // Récupérer les statistiques d'un utilisateur
  async getUserStats(userId: string) {
    const user = await this.findOne(userId);

    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: {
        status: true,
        total: true,
      },
    });

    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const ordersCount = orders.length;

    const favoritesCount = await this.prisma.favorite.count({
      where: { userId },
    });

    const cartsCount = await this.prisma.cart.count({
      where: { 
        userId,
        status: { not: 'FINALIZED' }
      },
    });

    return {
      user,
      stats: {
        totalSpent,
        ordersCount,
        favoritesCount,
        cartsCount,
        orders: {
          pending: orders.filter(o => o.status === 'PENDING').length,
          confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
          preparing: orders.filter(o => o.status === 'PREPARING').length,
          ready: orders.filter(o => o.status === 'READY').length,
          delivered: orders.filter(o => o.status === 'DELIVERED').length,
          cancelled: orders.filter(o => o.status === 'CANCELLED').length,
        },
      },
    };
  }

  // ADMIN: Mettre à jour le rôle d'un utilisateur
  async updateRole(userId: string, role: 'USER' | 'ADMIN' | 'SUPER') {
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

  // ADMIN: Supprimer un utilisateur
  async deleteUser(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}
