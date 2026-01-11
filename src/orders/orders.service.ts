// src/orders/orders.service.ts

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartStatus, OrderStatus, PaymentStatus } from 'src/generated/prisma/enums';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Générer un numéro de commande unique
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `CMD-${year}${month}${day}-${random}`;
  }

  /**
   * Créer une commande
   */
  async create(userId: string | undefined, dto: CreateOrderDto) {
    if (!userId) {
      throw new BadRequestException('L\'utilisateur doit être connecté pour passer une commande');
    }

    // Vérifier l'adresse si fournie
    let addressData = null;
    if (dto.addressId) {
      const address = await this.prisma.address.findUnique({
        where: { id: dto.addressId },
      });

      if (!address) {
        throw new NotFoundException('Adresse non trouvée');
      }

      if (address.userId !== userId) {
        throw new ForbiddenException('Cette adresse ne vous appartient pas');
      }

      addressData = address;
    }

    // Calculer les montants
    let subtotal = 0;
    const orderItems = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          media: {
            where: { isFeatured: true },
            take: 1,
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }

      if (!product.available) {
        throw new BadRequestException(`Le produit ${product.name} n'est pas disponible`);
      }

      // Vérifier le stock
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`
        );
      }

      const itemPrice = product.price * item.quantity;
      subtotal += itemPrice;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        note: item.note,
        productName: product.name, // ✅ Ajouté
        productImage: product.media[0]?.url, // ✅ Ajouté
      });
    }

    // Calculer les frais et total
    const deliveryFee = dto.deliveryFee || 0;
    const discount = dto.discount || 0;
    const tax = dto.tax || 0;
    const total = subtotal + deliveryFee - discount + tax;

    // Créer ou récupérer le panier
    let cartId = dto.cartId;
    if (!cartId) {
      const cart = await this.prisma.cart.create({
        data: {
          userId,
          status: CartStatus.FINALIZED,
        },
      });
      cartId = cart.id;
    }

    // Créer la commande
    const order = await this.prisma.order.create({
      data: {
        userId,
        orderNumber: this.generateOrderNumber(),
        
        // Adresse
        addressId: dto.addressId,
        deliveryName: dto.deliveryName || addressData?.fullName,
        deliveryPhone: dto.deliveryPhone || addressData?.phone,
        deliveryAddress: dto.deliveryAddress || addressData?.address,
        deliveryCity: dto.deliveryCity || addressData?.city,
        deliveryDistrict: dto.deliveryDistrict || addressData?.district,
        deliveryLandmark: dto.deliveryLandmark || addressData?.landmark,
        deliveryInstructions: dto.deliveryInstructions || addressData?.instructions,
        
        // Date et paiement
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        
        // Montants
        subtotal,
        deliveryFee,
        discount,
        tax,
        total,
        
        // Panier
        cartId,
        
        // Notes
        notes: dto.notes,
        
        // Items
        items: {
          create: orderItems,
        },
        
        // Historique
        statusHistory: {
          create: {
            status: OrderStatus.PENDING,
            note: 'Commande créée',
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                media: {
                  where: { isFeatured: true },
                  take: 1,
                },
              },
            },
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Finaliser le panier si fourni
    if (dto.cartId) {
      await this.prisma.cart.update({
        where: { id: dto.cartId },
        data: { status: CartStatus.FINALIZED },
      });
    }

    // Décrémenter le stock des produits
    for (const item of orderItems) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
        },
      });
    }

    // Mettre à jour les stats utilisateur
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: total },
        lastOrderDate: new Date(),
      },
    });

    return order;
  }

  /**
   * Récupérer toutes les commandes
   */
  async findAll(params?: {
    userId?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, status, paymentStatus, startDate, endDate, page = 1, limit = 20 } = params || {};

    const where: any = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  media: {
                    where: { isFeatured: true },
                    take: 1,
                  },
                },
              },
            },
          },
          address: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer une commande
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                media: true,
              },
            },
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        sale: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return order;
  }

  /**
   * Mettre à jour le statut d'une commande
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);

    // Créer une entrée dans l'historique
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: dto.status,
        note: dto.note,
        createdBy: dto.createdBy,
      },
    });

    // Mettre à jour la commande
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        deliveredAt: dto.status === OrderStatus.DELIVERED ? new Date() : undefined,
        cancelledAt: dto.status === OrderStatus.CANCELLED ? new Date() : undefined,
        cancelReason: dto.cancelReason,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        user: true,
      },
    });

    // Si la commande est annulée, remettre le stock
    if (dto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }
    }

    return updated;
  }

  /**
   * Mettre à jour le statut de paiement
   */
  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus, paymentMethod?: string) {
    await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus,
        paymentMethod,
        isPaid: paymentStatus === PaymentStatus.PAID,
        paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : undefined,
      },
    });
  }

  /**
   * Récupérer les commandes d'un utilisateur
   */
  async getUserOrders(userId: string, status?: OrderStatus) {
    return this.findAll({ userId, status });
  }

  /**
   * Récupérer les commandes en attente
   */
  async getPendingOrders() {
    return this.findAll({ status: OrderStatus.PENDING });
  }

  /**
   * Récupérer les commandes programmées
   */
  async getScheduledOrders() {
    return this.prisma.order.findMany({
      where: {
        scheduledAt: {
          gte: new Date(),
        },
        status: { not: OrderStatus.CANCELLED },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Annuler une commande
   */
  async cancelOrder(id: string, userId: string, reason?: string) {
    const order = await this.findOne(id);

    if (order.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres commandes');
    }

    if (!([OrderStatus.PENDING, OrderStatus.CONFIRMED] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException(
        'Seules les commandes en attente ou confirmées peuvent être annulées'
      );
    }

    return this.updateStatus(id, {
      status: OrderStatus.CANCELLED,
      note: 'Commande annulée par le client',
      cancelReason: reason,
    });
  }

  /**
   * Statistiques des commandes
   */
  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalOrders,
      aggregations,
      byStatus,
      byPaymentStatus,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: {
          total: true,
          subtotal: true,
          deliveryFee: true,
          discount: true,
        },
        _avg: {
          total: true,
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    byStatus.forEach(group => {
      statusCounts[group.status] = group._count;
    });

    const paymentStatusCounts: Record<string, number> = {};
    byPaymentStatus.forEach(group => {
      paymentStatusCounts[group.paymentStatus] = group._count;
    });

    return {
      totalOrders,
      totalRevenue: aggregations._sum.total || 0,
      totalSubtotal: aggregations._sum.subtotal || 0,
      totalDeliveryFees: aggregations._sum.deliveryFee || 0,
      totalDiscounts: aggregations._sum.discount || 0,
      averageOrderValue: aggregations._avg.total || 0,
      byStatus: statusCounts,
      byPaymentStatus: paymentStatusCounts,
    };
  }

  /**
   * Appliquer une négociation sur le prix
   */
  async negotiatePrice(id: string, negotiatedTotal: number, reason: string) {
    const order = await this.findOne(id);

    if (negotiatedTotal >= order.total) {
      throw new BadRequestException('Le prix négocié doit être inférieur au total');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        negotiatedTotal,
        negotiationNote: reason,
      },
    });
  }
}