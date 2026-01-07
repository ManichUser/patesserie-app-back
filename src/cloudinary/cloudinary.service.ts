import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'patisserie',
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      );
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException(`Upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              size: result.bytes,
            });
          }
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'patisserie',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new BadRequestException(`Delete failed: ${(error as any).message}`);
    }
}

  async deleteMultipleImages(publicIds: string[]): Promise<{ result: string }> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      throw new BadRequestException(`Bulk delete failed: ${(error as any).message}`);
    }
  }

  // Générer une URL optimisée
  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto:good',
      fetch_format: 'auto',
    });
  }

  // Générer un thumbnail
  getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto:low',
    });
  }
}
