import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportProductRowDto {
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

  @IsNumber()
  @Min(0)
  costUsd!: number;

  @IsNumber()
  @Min(0)
  marginPercent!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}

export class ImportProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductRowDto)
  rows!: ImportProductRowDto[];
}
