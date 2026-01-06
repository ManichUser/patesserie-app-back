import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartStatus, OrderStatus } from '../generated/prisma/enums';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // Générer un numéro de commande unique
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `CMD-${year}${month}${day}-${random}`;
  }

  // Créer une commande
  async create(userId: string | undefined, dto: CreateOrderDto) {
    if (!userId) {
      throw new BadRequestException('User must be logged in to place an order');
    }

    // Calculer le total
    let total = 0;
    const orderItems = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (!product.available) {
        throw new BadRequestException(`Product ${product.name} is not available`);
      }

      total += product.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        note: item.note,
      });
    }

    // Créer le panier si pas fourni
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

    const order = await this.prisma.order.create({
      data: {
        userId,
        orderNumber: this.generateOrderNumber(),
        deliveryName: dto.deliveryName,
        deliveryPhone: dto.deliveryPhone,
        deliveryAddress: dto.deliveryAddress,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        paymentMethod: dto.paymentMethod,
        total,
        cartId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isFeatured: true },
                  take: 1,
                },
              },
            },
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

    return order;
  }

  // Récupérer toutes les commandes
  async findAll(params?: { userId?: string; status?: OrderStatus; limit?: number }) {
    const where: any = {};

    if (params?.userId) {
      where.userId = params.userId;
    }

    if (params?.status) {
      where.status = params.status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isFeatured: true },
                  take: 1,
                },
              },
            },
          },
        },
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
      take: params?.limit,
    });
  }

  // Récupérer une commande
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
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

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Mettre à jour le statut d'une commande
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        isPaid: dto.isPaid,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // Récupérer les commandes d'un utilisateur
  async getUserOrders(userId: string) {
    return this.findAll({ userId });
  }

  // Récupérer les commandes en attente
  async getPendingOrders() {
    return this.findAll({ status: OrderStatus.PENDING });
  }

  // Récupérer les commandes programmées
  async getScheduledOrders() {
    return this.prisma.order.findMany({
      where: {
        scheduledAt: {
          gte: new Date(),
        },
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
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // Annuler une commande
  async cancelOrder(id: string, userId: string) {
    const order = await this.findOne(id);

    if (order.userId !== userId) {
      throw new BadRequestException('You can only cancel your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }
}
