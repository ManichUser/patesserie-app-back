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
import { CloudinaryService, MediaType } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('cloudinary')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  // =========================
  // UPLOAD SINGLE MEDIA
  // =========================
  @Post('upload')
  @Roles(Role.ADMIN, Role.SUPER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.cloudinaryService.uploadMedia(
      file,
      folder ?? 'patisserie',
    );

    return {
      message: 'Media uploaded successfully',
      data: result,
    };
  }

  // =========================
  // UPLOAD MULTIPLE MEDIA
  // =========================
  @Post('upload-multiple')
  @Roles(Role.ADMIN, Role.SUPER)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleMedia(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results = await this.cloudinaryService.uploadMultipleMedia(
      files,
      folder ?? 'patisserie',
    );

    return {
      message: `${results.length} media uploaded successfully`,
      data: results,
    };
  }

  // =========================
  // DELETE SINGLE MEDIA
  // =========================
  @Delete('delete')
  @Roles(Role.ADMIN, Role.SUPER)
  async deleteMedia(
    @Body('publicId') publicId: string,
    @Body('resourceType') resourceType: MediaType,
  ) {
    if (!publicId || !resourceType) {
      throw new BadRequestException(
        'publicId and resourceType are required',
      );
    }

    const result = await this.cloudinaryService.deleteMedia(
      publicId,
      resourceType,
    );

    return {
      message: 'Media deleted successfully',
      data: result,
    };
  }

  // =========================
  // DELETE MULTIPLE MEDIA
  // =========================
  @Delete('delete-multiple')
  @Roles(Role.ADMIN, Role.SUPER)
  async deleteMultipleMedia(
    @Body('publicIds') publicIds: string[],
    @Body('resourceType') resourceType: MediaType,
  ) {
    if (!publicIds || publicIds.length === 0 || !resourceType) {
      throw new BadRequestException(
        'publicIds and resourceType are required',
      );
    }

    const result = await this.cloudinaryService.deleteMultipleMedia(
      publicIds,
      resourceType,
    );

    return {
      message: 'Media deleted successfully',
      data: result,
    };
  }
}
