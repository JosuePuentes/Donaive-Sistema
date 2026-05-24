import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InventoryMovementType,
  InventoryAdjustmentReason,
} from '@prisma/client';

export class ListMovementsQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementType;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}

export class AdjustmentLineDto {
  @IsString()
  productId!: string;

  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAdjustmentDto {
  @IsEnum(InventoryAdjustmentReason)
  reason!: InventoryAdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines!: AdjustmentLineDto[];
}

export class CreateShrinkageDto {
  @IsEnum(InventoryAdjustmentReason)
  reason!: InventoryAdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShrinkageLineDto)
  lines!: ShrinkageLineDto[];
}

export class ShrinkageLineDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
