import {
    Controller,
    Post,
    Delete,
    Param,
    Body,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    BadRequestException,
    Patch,
  } from '@nestjs/common';
  import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
  import { ProductsService } from './products.service';
  import { CloudinaryService } from '../cloudinary/cloudinary.service';
  import { PrismaService } from '../prisma/prisma.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator'; 
import { Role } from '../generated/prisma/enums';
  import { AddProductImageDto } from './dto/add-product-image.dto';
  
  @Controller('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class ProductsImagesController {
    constructor(
      private productsService: ProductsService,
      private cloudinaryService: CloudinaryService,
      private prisma: PrismaService,
    ) {}
  
    @Post(':id/images')
    @Roles(Role.ADMIN, Role.SUPER)
    @UseInterceptors(FileInterceptor('file'))
    async addProductImage(
      @Param('id') productId: string,
      @UploadedFile() file: Express.Multer.File,
      @Body() dto: AddProductImageDto,
    ) {
      // Vérifier que le produit existe
      await this.productsService.findOne(productId);
  
      // Upload sur Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'patisserie/products',
      );
  
      // Si c'est l'image principale, retirer le flag des autres
      if (dto.isFeatured) {
        await this.prisma.productImage.updateMany({
          where: { productId },
          data: { isFeatured: false },
        });
      }
  
      // Créer l'entrée en base
      const image = await this.prisma.productImage.create({
        data: {
          productId,
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          altText: dto.altText,
          isFeatured: dto.isFeatured || false,
          order: dto.order || 0,
        },
      });
  
      return {
        message: 'Image added successfully',
        data: image,
      };
    }
  
    @Post(':id/images/multiple')
    @Roles(Role.ADMIN, Role.SUPER)
    @UseInterceptors(FilesInterceptor('files', 10))
    async addMultipleProductImages(
      @Param('id') productId: string,
      @UploadedFiles() files: Express.Multer.File[],
    ) {
      await this.productsService.findOne(productId);
  
      const uploadResults = await this.cloudinaryService.uploadMultipleImages(
        files,
        'patisserie/products',
      );
  
      const images = await Promise.all(
        uploadResults.map((result, index) =>
          this.prisma.productImage.create({
            data: {
              productId,
              url: result.url,
              publicId: result.publicId,
              order: index,
            },
          }),
        ),
      );
  
      return {
        message: `${images.length} images added successfully`,
        data: images,
      };
    }
  
    @Patch('images/:imageId')
    @Roles(Role.ADMIN, Role.SUPER)
    async updateProductImage(
      @Param('imageId') imageId: string,
      @Body() dto: AddProductImageDto,
    ) {
      const image = await this.prisma.productImage.findUnique({
        where: { id: imageId },
      });
  
      if (!image) {
        throw new BadRequestException('Image not found');
      }
  
      // Si on met cette image en featured, retirer le flag des autres
      if (dto.isFeatured) {
        await this.prisma.productImage.updateMany({
          where: { 
            productId: image.productId,
            id: { not: imageId }
          },
          data: { isFeatured: false },
        });
      }
  
      return this.prisma.productImage.update({
        where: { id: imageId },
        data: dto,
      });
    }
  
    @Delete('images/:imageId')
    @Roles(Role.ADMIN, Role.SUPER)
    async deleteProductImage(@Param('imageId') imageId: string) {
      const image = await this.prisma.productImage.findUnique({
        where: { id: imageId },
      });
  
      if (!image) {
        throw new BadRequestException('Image not found');
      }
  
      // Supprimer de Cloudinary
      await this.cloudinaryService.deleteImage(image.publicId);
  
      // Supprimer de la base
      await this.prisma.productImage.delete({
        where: { id: imageId },
      });
  
      return {
        message: 'Image deleted successfully',
      };
    }
  }