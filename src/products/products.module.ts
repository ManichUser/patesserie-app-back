import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsImagesController } from './products-images.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [
    ProductsController,
    ProductsImagesController,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}