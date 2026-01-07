import {
    Controller,
    Post,
    Delete,
    Body,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
  import { CloudinaryService } from './cloudinary.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../generated/prisma/enums';
  
  @Controller('cloudinary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class CloudinaryController {
    constructor(private cloudinaryService: CloudinaryService) {}
  
    @Post('upload')
    @Roles(Role.ADMIN, Role.SUPER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
      @UploadedFile() file: Express.Multer.File,
      @Body('folder') folder?: string,
    ) {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
  
      const result = await this.cloudinaryService.uploadImage(
        file,
        folder || 'patisserie/products',
      );
  
      return {
        message: 'Image uploaded successfully',
        data: result,
      };
    }
  
    @Post('upload-multiple')
    @Roles(Role.ADMIN, Role.SUPER)
    @UseInterceptors(FilesInterceptor('files', 10))
    async uploadMultipleImages(
      @UploadedFiles() files: Express.Multer.File[],
      @Body('folder') folder?: string,
    ) {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }
  
      const results = await this.cloudinaryService.uploadMultipleImages(
        files,
        folder || 'patisserie/products',
      );
  
      return {
        message: `${results.length} images uploaded successfully`,
        data: results,
      };
    }
  
    @Delete('delete')
    @Roles(Role.ADMIN, Role.SUPER)
    async deleteImage(@Body('publicId') publicId: string) {
      const result = await this.cloudinaryService.deleteImage(publicId);
  
      return {
        message: 'Image deleted successfully',
        data: result,
      };
    }
  
    @Delete('delete-multiple')
    @Roles(Role.ADMIN, Role.SUPER)
    async deleteMultipleImages(@Body('publicIds') publicIds: string[]) {
      const result = await this.cloudinaryService.deleteMultipleImages(publicIds);
  
      return {
        message: 'Images deleted successfully',
        data: result,
      };
    }
  }
  