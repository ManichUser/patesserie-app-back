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
  Get,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { AddProductMediaDto } from './dto/add-product-media.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsMediaController {
  constructor(
    private productsService: ProductsService,
    private cloudinaryService: CloudinaryService,
    private prisma: PrismaService,
  ) {}

  // ✨ Upload image OU vidéo
  @Post(':id/media')
  @Roles(Role.ADMIN, Role.SUPER)
  @UseInterceptors(FileInterceptor('file'))
  async addProductMedia(
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddProductMediaDto,
  ) {
    await this.productsService.findOne(productId);

    // Upload automatique (image ou vidéo)
    const uploadResult = await this.cloudinaryService.uploadMedia(
      file,
      'patisserie/products',
    );

    // Déterminer le type
    const mediaType = uploadResult.resourceType === 'video' ? 'VIDEO' : 'IMAGE';

  


    if (dto.isFeatured) {
      await this.prisma.productMedia.updateMany({
        where: { productId, type: mediaType },
        data: { isFeatured: false },
      });
    }

    const media = await this.prisma.productMedia.create({
      data: {
        productId,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        type: mediaType,
        altText: dto.altText,
        isFeatured: dto.isFeatured || false,
        order: dto.order || 0,
        duration: uploadResult.duration,
        size: uploadResult.size,
        format: uploadResult.format,
      },
    });

    return {
      message: `${mediaType} added successfully`,
      data: media,
    };
  }

  // Upload multiple (media ET/OU vidéos)
  @Post(':id/media/multiple')
  @Roles(Role.ADMIN, Role.SUPER)
  @UseInterceptors(FilesInterceptor('files', 10))
  async addMultipleProductMedia(
    @Param('id') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.productsService.findOne(productId);

    const uploadPromises = files.map((file) =>
      this.cloudinaryService.uploadMedia(file, 'patisserie/products'),
    );
    const uploadResults = await Promise.all(uploadPromises);

    const mediaItems = await Promise.all(
      uploadResults.map((result, index) =>
        this.prisma.productMedia.create({
          data: {
            productId,
            url: result.url,
            publicId: result.publicId,
            type: result.resourceType === 'video' ? 'VIDEO' : 'IMAGE',
            order: index,
            duration: result.duration,
            size: result.size,
            format: result.format,
          },
        }),
      ),
    );

    return {
      message: `${mediaItems.length} media files added successfully`,
      data: mediaItems,
    };
  }

  // Récupérer tous les media d'un produit
  @Get(':id/media')
  async getProductMedia(@Param('id') productId: string) {
    return this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });
  }

  // Modifier un media
  @Patch('media/:mediaId')
  @Roles(Role.ADMIN, Role.SUPER)
  async updateProductMedia(
    @Param('mediaId') mediaId: string,
    @Body() dto: AddProductMediaDto,
  ) {
    const media = await this.prisma.productMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new BadRequestException('Media not found');
    }



    if (dto.isFeatured) {
      await this.prisma.productMedia.updateMany({
        where: {
          productId: media.productId,
          type: media.type,
          id: { not: mediaId },
        },
        data: { isFeatured: false },
      });
    }

    return this.prisma.productMedia.update({
      where: { id: mediaId },
      data: {
        altText: dto.altText,
        isFeatured : dto.isFeatured,
        order: dto.order ?? media.order,
      },
    });
  }

  // Supprimer un media
  @Delete('media/:mediaId')
  @Roles(Role.ADMIN, Role.SUPER)
  async deleteProductMedia(@Param('mediaId') mediaId: string) {
    const media = await this.prisma.productMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new BadRequestException('Media not found');
    }

    // Supprimer de Cloudinary
    const resourceType = media.type === 'VIDEO' ? 'video' : 'image';
    await this.cloudinaryService.deleteMedia(media.publicId, resourceType);

    // Supprimer de la base
    await this.prisma.productMedia.delete({
      where: { id: mediaId },
    });

    return {
      message: 'Media deleted successfully',
    };
  }
}