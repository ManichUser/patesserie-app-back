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

  // ============================================
  // 1. CRÉER L'ADMIN
  // ============================================
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

  // ============================================
  // 2. CRÉER LES CATÉGORIES
  // ============================================
  console.log('📦 Création des catégories...');

  const gateauxCategory = await prisma.category.upsert({
    where: { slug: 'gateaux' },
    update: {},
    create: {
      name: 'Gâteaux',
      slug: 'gateaux',
      description: 'Nos délicieux gâteaux faits maison',
      icon: '🎂',
      order: 1,
      isActive: true,
    },
  });

  const tartesCategory = await prisma.category.upsert({
    where: { slug: 'tartes' },
    update: {},
    create: {
      name: 'Tartes',
      slug: 'tartes',
      description: 'Tartes aux fruits de saison',
      icon: '🥧',
      order: 2,
      isActive: true,
    },
  });

  const viennoiseriesCategory = await prisma.category.upsert({
    where: { slug: 'viennoiseries' },
    update: {},
    create: {
      name: 'Viennoiseries',
      slug: 'viennoiseries',
      description: 'Croissants, pains au chocolat...',
      icon: '🥐',
      order: 3,
      isActive: true,
    },
  });

  const macaronsCategory = await prisma.category.upsert({
    where: { slug: 'macarons' },
    update: {},
    create: {
      name: 'Macarons',
      slug: 'macarons',
      description: 'Macarons artisanaux aux saveurs variées',
      icon: '🍪',
      order: 4,
      isActive: true,
    },
  });

  console.log('✅ Catégories créées');

  // ============================================
  // 3. CRÉER LES PRODUITS
  // ============================================
  console.log('🍰 Création des produits...');

  // Vérifier si les produits existent déjà
  const existingCake = await prisma.product.findFirst({
    where: { name: 'Gâteau Chocolat' },
  });

  let cake;
  if (!existingCake) {
    // Création du gâteau au chocolat
    cake = await prisma.product.create({
      data: {
        name: 'Gâteau Chocolat',
        description: 'Gâteau fondant au chocolat noir avec ganache',
        price: 5000,
        costPrice: 2500,
        categoryId: gateauxCategory.id,
        stock: 10,
        lowStockThreshold: 3,
        available: true,
        weight: 1.0,
        servings: 8,
        calories: 350,
        protein: 5.0,
        carbs: 45.0,
        fat: 18.0,
        prepTime: 60,
        allergens: ['gluten', 'eggs', 'milk'],
        ingredients: 'Chocolat noir, farine, œufs, sucre, beurre',
      },
    });
    console.log('✅ Produit créé:', cake.name);

    // Tarte aux Fruits
    const tarte = await prisma.product.create({
      data: {
        name: 'Tarte aux Fruits',
        description: 'Tarte fraîche aux fruits de saison',
        price: 4500,
        costPrice: 2000,
        categoryId: tartesCategory.id,
        stock: 8,
        lowStockThreshold: 2,
        available: true,
        weight: 0.9,
        servings: 6,
        calories: 280,
        protein: 3.0,
        carbs: 38.0,
        fat: 12.0,
        prepTime: 45,
        allergens: ['gluten', 'eggs'],
        ingredients: 'Fruits frais, pâte sablée, crème pâtissière',
      },
    });
    console.log('✅ Produit créé:', tarte.name);

    // Croissant
    const croissant = await prisma.product.create({
      data: {
        name: 'Croissant',
        description: 'Croissant beurré croustillant pur beurre',
        price: 500,
        costPrice: 200,
        categoryId: viennoiseriesCategory.id,
        stock: 20,
        lowStockThreshold: 5,
        available: true,
        weight: 0.07,
        servings: 1,
        calories: 230,
        protein: 4.0,
        carbs: 26.0,
        fat: 12.0,
        prepTime: 20,
        allergens: ['gluten', 'milk'],
        ingredients: 'Farine, beurre, levure, sel, sucre',
      },
    });
    console.log('✅ Produit créé:', croissant.name);

    // Macaron Assortis
    const macaron = await prisma.product.create({
      data: {
        name: 'Macaron Assortis',
        description: 'Boîte de 6 macarons aux parfums variés',
        price: 3000,
        costPrice: 1200,
        categoryId: macaronsCategory.id,
        stock: 15,
        lowStockThreshold: 5,
        available: true,
        weight: 0.12,
        servings: 6,
        calories: 90,
        protein: 2.0,
        carbs: 15.0,
        fat: 3.0,
        prepTime: 90,
        allergens: ['eggs', 'nuts'],
        ingredients: 'Amandes, sucre, blancs d\'œufs, colorants naturels',
      },
    });
    console.log('✅ Produit créé:', macaron.name);

    // Red Velvet
    await prisma.product.create({
      data: {
        name: 'Red Velvet',
        description: 'Gâteau Red Velvet avec cream cheese frosting',
        price: 6000,
        costPrice: 2800,
        categoryId: gateauxCategory.id,
        stock: 5,
        lowStockThreshold: 2,
        available: true,
        weight: 1.2,
        servings: 10,
        calories: 380,
        protein: 5.5,
        carbs: 48.0,
        fat: 20.0,
        prepTime: 75,
        allergens: ['gluten', 'eggs', 'milk'],
        ingredients: 'Farine, cacao, colorant rouge, cream cheese, beurre',
      },
    });
    console.log('✅ Produit créé: Red Velvet');

  } else {
    cake = existingCake;
    console.log('ℹ️  Produits déjà existants');
  }

  // ============================================
  // 4. CRÉER UN PANIER DE TEST
  // ============================================
  console.log('🛒 Création du panier...');

  const existingCart = await prisma.cart.findFirst({
    where: { userId: admin.id },
  });

  if (!existingCart) {
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
            priceAtAdd: cake.price,
          },
        },
      },
    });
    console.log('✅ Panier créé pour admin');
  } else {
    console.log('ℹ️  Panier déjà existant pour admin');
  }

  // ============================================
  // 5. CRÉER UN COUPON DE TEST
  // ============================================
  console.log('🎟️  Création des coupons...');

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: 'Réduction de 10% pour les nouveaux clients',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 2000,
      usageLimit: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'BIENVENUE' },
    update: {},
    create: {
      code: 'BIENVENUE',
      description: 'Livraison gratuite',
      type: 'FREE_DELIVERY',
      value: 0,
      minOrderAmount: 5000,
      usageLimit: 50,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 jours
      isActive: true,
    },
  });

  console.log('✅ Coupons créés');

  console.log('🎉 Seed terminé avec succès!');
  console.log('\n📊 Résumé:');
  console.log(`- Admin: ${admin.email}`);
  console.log(`- Catégories: 4`);
  console.log(`- Produits: 5`);
  console.log(`- Coupons: 2`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });