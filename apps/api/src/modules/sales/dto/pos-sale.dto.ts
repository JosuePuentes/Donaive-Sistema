import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PosSaleLineDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountUsd?: number;
}

export class PosPaymentLineDto {
  @IsString()
  paymentMethodId!: string;

  @IsNumber()
  @Min(0.0001)
  amount!: number;

  @IsIn(['USD', 'VES'])
  currency!: 'USD' | 'VES';
}

export class PosChangeDto {
  @IsString()
  paymentMethodId!: string;

  @IsIn(['USD', 'VES'])
  currency!: 'USD' | 'VES';

  @IsNumber()
  @Min(0.0001)
  amount!: number;
}

export class CreatePosSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosSaleLineDto)
  lines!: PosSaleLineDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosPaymentLineDto)
  payments!: PosPaymentLineDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PosChangeDto)
  change?: PosChangeDto;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
