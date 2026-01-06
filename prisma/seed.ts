import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role, CartStatus } from '../src/generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🌱 Starting seed...');

  // Vérifie si l'admin existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@patisserie.com' },
  });

  let admin;

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin-patisserie!', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@patisserie.com',
        phone: '+237657857548',
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log('✅ Admin créé:', admin.email);
  } else {
    admin = existingAdmin;
    console.log('ℹ️  Admin déjà existant:', admin.email);
  }

  // Vérifier si les produits existent déjà
  const existingCake = await prisma.product.findFirst({
    where: { name: 'Gâteau Chocolat' },
  });

  let cake;

  if (!existingCake) {
    // Création de produits
    cake = await prisma.product.create({
      data: {
        name: 'Gâteau Chocolat',
        description: 'Gâteau fondant au chocolat',
        price: 5000,
        category: 'Gâteaux',
        stock: 10,
      },
    });
    console.log('✅ Produit créé:', cake.name);

    // Créer d'autres produits
    const tarte = await prisma.product.create({
      data: {
        name: 'Tarte aux Fruits',
        description: 'Tarte fraîche aux fruits de saison',
        price: 4500,
        category: 'Tartes',
        stock: 8,
      },
    });
    console.log('✅ Produit créé:', tarte.name);

    const croissant = await prisma.product.create({
      data: {
        name: 'Croissant',
        description: 'Croissant beurré croustillant',
        price: 500,
        category: 'Viennoiseries',
        stock: 20,
      },
    });
    console.log('✅ Produit créé:', croissant.name);

    const macaron = await prisma.product.create({
      data: {
        name: 'Macaron Assortis',
        description: 'Boîte de 6 macarons aux parfums variés',
        price: 3000,
        category: 'Macarons',
        stock: 15,
      },
    });
    console.log('✅ Produit créé:', macaron.name);
  } else {
    cake = existingCake;
    console.log('ℹ️  Produits déjà existants');
  }

  // Vérifier si le panier existe déjà
  const existingCart = await prisma.cart.findFirst({
    where: { userId: admin.id },
  });

  if (!existingCart) {
    // Création du panier avec item
    await prisma.cart.create({
      data: {
        userId: admin.id,
        status: CartStatus.SAVED,
        name: 'Mon panier test',
        items: {
          create: {
            productId: cake.id,
            quantity: 2,
            note: 'Test seed',
          },
        },
      },
    });
    console.log('✅ Panier créé pour admin');
  } else {
    console.log('ℹ️  Panier déjà existant pour admin');
  }

  console.log('🎉 Seed terminé avec succès!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Fermer le pool PostgreSQL
  });