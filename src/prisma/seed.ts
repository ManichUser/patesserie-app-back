import { PrismaClient } from "@prisma/client/extension";
import { Role, CartStatus } from "src/generated/prisma/enums";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Vérifie si l'admin existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@patisserie.com" },
  });

  let admin;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin-patisserie!", 10);

    admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@patisserie.com",
        phone: "+237657857548",
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    console.log("✅ Admin créé");
  } else {
    admin = existingAdmin;
    console.log("ℹ️ Admin déjà existant");
  }

  // Création d'un produit
  const cake = await prisma.product.create({
    data: {
      name: "Gâteau Chocolat",
      description: "Gâteau fondant au chocolat",
      price: 5000,
      category: "Gâteaux",
      stock: 10,
    },
  });

  // Création du panier avec item
  await prisma.cart.create({
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
