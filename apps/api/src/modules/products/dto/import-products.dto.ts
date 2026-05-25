import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { parseImportNumber } from '../../../common/utils/parse-import-number';

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

  @Transform(({ value }) => parseImportNumber(value, 0))
  @IsNumber()
  @Min(0)
  costUsd!: number;

  @Transform(({ value }) => {
    let n = parseImportNumber(value, 30);
    if (n > 0 && n <= 1) n = n * 100;
    return n;
  })
  @IsNumber()
  @Min(0)
  marginPercent!: number;

  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : parseImportNumber(value, 0)))
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
