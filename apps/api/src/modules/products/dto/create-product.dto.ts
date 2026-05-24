import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ProductUnit } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @MaxLength(50)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsNumber()
  @Min(0)
  costUsd!: number;

  @IsNumber()
  @Min(0)
  marginPercent!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialStock?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marginPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number | null;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
