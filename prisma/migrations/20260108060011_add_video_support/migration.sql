/*
  Warnings:

  - You are about to drop the `product_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_productId_fkey";

-- DropTable
DROP TABLE "product_images";

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "altText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "size" INTEGER,
    "format" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_media_productId_idx" ON "product_media"("productId");

-- CreateIndex
CREATE INDEX "product_media_type_idx" ON "product_media"("type");

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
