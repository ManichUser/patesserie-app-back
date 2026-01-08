import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export type MediaType = 'image' | 'video';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  resourceType: MediaType;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50MB

@Injectable()
export class CloudinaryService {

  // =========================
  // PUBLIC API
  // =========================

  async uploadMedia(
    file: Express.Multer.File,
    folder = 'patisserie',
  ): Promise<UploadResult> {
    this.validateFile(file);

    const mediaType = this.detectMediaType(file.mimetype);
    this.validateFileSize(file, mediaType);

    return this.uploadStream(file, folder, mediaType);
  }

  async uploadMultipleMedia(
    files: Express.Multer.File[],
    folder = 'patisserie',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return Promise.all(files.map(file => this.uploadMedia(file, folder)));
  }

  async deleteMedia(
    publicId: string,
    resourceType: MediaType,
  ): Promise<{ result: string }> {
    try {
      return await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      throw new BadRequestException(`Delete failed: ${(error as any).message}`);
    }
  }

  async deleteMultipleMedia(
    publicIds: string[],
    resourceType: MediaType,
  ): Promise<{ deleted: Record<string, string> }> {
    try {
      return await cloudinary.api.delete_resources(publicIds, {
        resource_type: resourceType,
      });
    } catch (error) {
      throw new BadRequestException(
        `Bulk delete failed: ${(error as any).message}`,
      );
    }
  }

  // =========================
  // URL HELPERS
  // =========================

  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto:good',
      fetch_format: 'auto',
    });
  }

  getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto:low',
    });
  }

  // =========================
  // INTERNAL HELPERS
  // =========================

  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer) {
      throw new BadRequestException('Invalid file buffer');
    }
  }

  private detectMediaType(mimetype: string): MediaType {
    if (IMAGE_TYPES.includes(mimetype)) return 'image';
    if (VIDEO_TYPES.includes(mimetype)) return 'video';

    throw new BadRequestException(
      'Invalid file type. Only images (JPEG, PNG, WebP) and videos (MP4, MOV, WebM) are allowed',
    );
  }

  private validateFileSize(file: Express.Multer.File, type: MediaType) {
    const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (file.size > maxSize) {
      throw new BadRequestException(
        `${type.toUpperCase()} size must be less than ${maxSize / 1024 / 1024}MB`,
      );
    }
  }

  private uploadStream(
    file: Express.Multer.File,
    folder: string,
    resourceType: MediaType,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          transformation: this.getTransformations(resourceType),
        },
        (error, result) => {
          if (error) {
            return reject(
              new BadRequestException(`Upload failed: ${error.message}`),
            );
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            duration: result.duration,
            resourceType,
          });
        },
      );

      // ⏱️ Timeout sécurité (30s)
      const timeout = setTimeout(() => {
        uploadStream.destroy(new Error('Upload timeout'));
      }, 30_000);

      Readable.from(file.buffer)
        .on('end', () => clearTimeout(timeout))
        .pipe(uploadStream);
    });
  }

  private getTransformations(type: MediaType) {
    if (type === 'image') {
      return [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ];
    }

    return [
      { width: 1920, height: 1080, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ];
  }
}
