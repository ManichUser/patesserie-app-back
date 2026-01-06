import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartStatus } from '../generated/prisma/enums';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // Récupérer ou créer un panier
  async getOrCreateCart(userId?: string, cartId?: string) {
    // Panier temporaire (visiteur)
    if (cartId && !userId) {
      let cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
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

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { status: CartStatus.TEMP },
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
        orderBy: { updatedAt: 'desc' },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            userId,
            status: CartStatus.SAVED,
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
      }

      return cart;
    }

    throw new BadRequestException('Either userId or cartId must be provided');
  }

  // Ajouter un produit au panier
  async addItem(userId: string | undefined, cartId: string | undefined, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId, cartId);

    // Vérifier que le produit existe
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.available) {
      throw new BadRequestException('Product is not available');
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
      // Mettre à jour la quantité
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + dto.quantity,
          note: dto.note || existingItem.note,
        },
      });
    } else {
      // Créer nouvel item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
          note: dto.note,
        },
      });
    }

    return this.getOrCreateCart(userId, cart.id);
  }

  // Modifier un item du panier
  async updateItem(cartItemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: dto,
    });
  }

  // Supprimer un item du panier
  async removeItem(cartItemId: string) {
    return this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  // Vider le panier
  async clearCart(cartId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return { message: 'Cart cleared' };
  }

  // Récupérer tous les paniers d'un utilisateur
  async getUserCarts(userId: string) {
    return this.prisma.cart.findMany({
      where: {
        userId,
        status: CartStatus.SAVED,
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
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Sauvegarder un panier avec un nom
  async saveCart(cartId: string, name: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        name,
        status: CartStatus.SAVED,
      },
    });
  }

  // Fusionner panier temporaire avec panier utilisateur
  async mergeCarts(userId: string, tempCartId: string) {
    const tempCart = await this.prisma.cart.findUnique({
      where: { id: tempCartId },
      include: { items: true },
    });

    if (!tempCart) return;

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
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            note: item.note,
          },
        });
      }
    }

    // Supprimer le panier temporaire
    await this.prisma.cart.delete({ where: { id: tempCartId } });

    return userCart;
  }
}
