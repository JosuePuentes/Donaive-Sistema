import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseLineDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCostUsd!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  marginPercent?: number;
}

export class CreatePurchaseDto {
  @IsString()
  supplierId!: string;

  @IsDateString()
  purchaseDate!: string;

  @IsString()
  @MaxLength(50)
  supplierInvoiceNumber!: string;

  @IsString()
  @MaxLength(50)
  supplierControlNumber!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines!: PurchaseLineDto[];

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  tasaBcvMomento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @IsOptional()
  @IsBoolean()
  isCredit?: boolean;

  @ValidateIf((o: CreatePurchaseDto) => o.isCredit === true)
  @IsDateString()
  dueDate?: string;

  @ValidateIf((o: CreatePurchaseDto) => !o.isCredit)
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
