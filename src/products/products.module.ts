import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsMediaController } from './products-media.controller'; // ← Nouveau
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [
    ProductsController,
    ProductsMediaController, 
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}