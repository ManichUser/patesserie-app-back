import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class AddProductImageDto {
  @IsString()
  @IsOptional()
  altText?: string;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  order?: number;
}