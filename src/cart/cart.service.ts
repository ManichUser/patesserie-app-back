// src/carts/carts.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartStatus } from 'src/generated/prisma/enums';

@Injectable()
export class CartsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer ou créer un panier
   */
  async getOrCreateCart(userId?: string, cartId?: string, sessionId?: string) {
    // Panier temporaire (visiteur)
    if (!userId && (cartId || sessionId)) {
      let cart = null;

      // Chercher par cartId
      if (cartId) {
        cart = await this.prisma.cart.findUnique({
          where: { id: cartId },
          include: this.getCartIncludes(),
        });
      }

      // Chercher par sessionId
      if (!cart && sessionId) {
        cart = await this.prisma.cart.findUnique({
          where: { sessionId },
          include: this.getCartIncludes(),
        });
      }

      // Créer nouveau panier temporaire
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            status: CartStatus.TEMP,
            sessionId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
          },
          include: this.getCartIncludes(),
        });
      }

      return cart;
    }

    // Panier utilisateur connecté
    if (userId) {
      let cart = await this.prisma.cart.findFirst({
        where: {
          userId,
          status: { in: [CartStatus.TEMP, CartStatus.SAVED] },
        },
        include: this.getCartIncludes(),
        orderBy: { updatedAt: 'desc' },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            userId,
            status: CartStatus.SAVED,
          },
          include: this.getCartIncludes(),
        });
      }

      return cart;
    }

    throw new BadRequestException('Either userId, cartId or sessionId must be provided');
  }

  /**
   * Ajouter un produit au panier
   */
  async addItem(userId: string | undefined, cartId: string | undefined, sessionId: string | undefined, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId, cartId, sessionId);

    // Vérifier que le produit existe
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    if (!product.available) {
      throw new BadRequestException('Produit non disponible');
    }

    // Vérifier le stock
    if (product.stock < dto.quantity) {
      throw new BadRequestException(`Stock insuffisant. Disponible: ${product.stock}`);
    }

    // Vérifier si l'item existe déjà
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      // Vérifier le stock pour la nouvelle quantité
      const newQuantity = existingItem.quantity + dto.quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Stock insuffisant. Disponible: ${product.stock}`);
      }

      // Mettre à jour la quantité
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          note: dto.note || existingItem.note,
        },
      });
    } else {
      // Créer nouvel item avec le prix actuel
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
          note: dto.note,
          priceAtAdd: product.price, // ✅ Sauvegarder le prix
        },
      });
    }

    return this.getOrCreateCart(userId, cart.id, sessionId);
  }

  /**
   * Modifier un item du panier
   */
  async updateItem(cartItemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Item non trouvé');
    }

    // Vérifier le stock si la quantité change
    if (dto.quantity && dto.quantity !== item.quantity) {
      if (item.product.stock < dto.quantity) {
        throw new BadRequestException(`Stock insuffisant. Disponible: ${item.product.stock}`);
      }
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity: dto.quantity,
        note: dto.note,
      },
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
    });
  }

  /**
   * Supprimer un item du panier
   */
  async removeItem(cartItemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item) {
      throw new NotFoundException('Item non trouvé');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { message: 'Item supprimé du panier' };
  }

  /**
   * Vider le panier
   */
  async clearCart(cartId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return { message: 'Panier vidé' };
  }

  /**
   * Récupérer tous les paniers d'un utilisateur
   */
  async getUserCarts(userId: string) {
    return this.prisma.cart.findMany({
      where: {
        userId,
        status: CartStatus.SAVED,
      },
      include: this.getCartIncludes(),
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Sauvegarder un panier avec un nom
   */
  async saveCart(cartId: string, name: string, userId?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Panier non trouvé');
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        name,
        status: CartStatus.SAVED,
        userId, // Associer au user si fourni
        sessionId: userId ? null : cart.sessionId, // Supprimer sessionId si user
      },
    });
  }

  /**
   * Fusionner panier temporaire avec panier utilisateur
   */
  async mergeCarts(userId: string, tempCartId: string) {
    const tempCart = await this.prisma.cart.findUnique({
      where: { id: tempCartId },
      include: { items: true },
    });

    if (!tempCart || !tempCart.items.length) {
      return this.getOrCreateCart(userId);
    }

    const userCart = await this.getOrCreateCart(userId);

    // Fusionner les items
    for (const item of tempCart.items) {
      const existingItem = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: userCart.id,
            productId: item.productId,
          },
        },
      });

      if (existingItem) {
        // Mettre à jour la quantité
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity },
        });
      } else {
        // Créer nouvel item avec le prix conservé
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            note: item.note,
            priceAtAdd: item.priceAtAdd, // ✅ Conserver le prix d'ajout
          },
        });
      }
    }

    // Supprimer le panier temporaire
    await this.prisma.cart.delete({ where: { id: tempCartId } });

    return this.getOrCreateCart(userId);
  }

  /**
   * Calculer le total du panier
   */
  async getCartTotal(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Panier non trouvé');
    }

    let subtotal = 0;
    let total = 0;

    cart.items.forEach(item => {
      // Utiliser priceAtAdd si disponible, sinon le prix actuel
      const price = item.priceAtAdd || item.product.price;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
    });

    total = subtotal;

    return {
      cartId: cart.id,
      itemsCount: cart.items.length,
      subtotal,
      deliveryFee: 0, // À calculer selon la logique métier
      discount: 0, // À calculer si coupon appliqué
      total,
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        currentPrice: item.product.price,
        itemTotal: (item.priceAtAdd || item.product.price) * item.quantity,
      })),
    };
  }

  /**
   * Nettoyer les paniers expirés
   */
  async cleanExpiredCarts() {
    const now = new Date();

    const expired = await this.prisma.cart.deleteMany({
      where: {
        status: CartStatus.TEMP,
        expiresAt: { lt: now },
      },
    });

    return { deleted: expired.count };
  }

  /**
   * Récupérer le panier actif d'un utilisateur
   */
  async getActiveCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: { in: [CartStatus.TEMP, CartStatus.SAVED] },
      },
      include: this.getCartIncludes(),
      orderBy: { updatedAt: 'desc' },
    });

    if (!cart) {
      return this.getOrCreateCart(userId);
    }

    return cart;
  }

  /**
   * Helper: Includes pour les requêtes de panier
   */
  private getCartIncludes() {
    return {
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
        orderBy: { createdAt: 'desc' as const },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };
  }
}