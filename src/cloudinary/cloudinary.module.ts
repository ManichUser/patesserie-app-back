import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';
import { CloudinaryProvider } from './cloudinary.config';

@Module({
  imports: [ConfigModule],
  controllers: [CloudinaryController],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService, CloudinaryProvider],
})
export class CloudinaryModule {}