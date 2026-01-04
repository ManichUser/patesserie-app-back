import { PrismaClient } from "@prisma/client/extension";
import { Role, CartStatus } from "src/generated/prisma/enums";


const prisma = new PrismaClient();

async function main() {
  // Admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@patisserie.com",
      phone: "+237657857548",
      password: "hashed_password_here",
      role: Role.ADMIN,
    },
  });

  // Produit
  const cake = await prisma.product.create({
    data: {
      name: "Gâteau Chocolat",
      description: "Gâteau fondant au chocolat",
      price: 5000,
      category: "Gâteaux",
      stock: 10,
    },
  });

  // Panier
  const cart = await prisma.cart.create({
    data: {
      userId: admin.id,
      status: CartStatus.TEMP,
      items: {
        create: {
          productId: cake.id,
          quantity: 1,
        },
      },
    },
  });

  console.log("✅ Seed terminé avec succès");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
