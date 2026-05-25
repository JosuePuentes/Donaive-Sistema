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

export class CxpAbonoLineDto {
  @IsString()
  accountPayableId!: string;

  @IsNumber()
  @Min(0.0001)
  amount!: number;

  @IsIn(['USD', 'VES'])
  currency!: 'USD' | 'VES';
}

export class CxpAbonoDto {
  @IsString()
  paymentMethodId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CxpAbonoLineDto)
  lineas!: CxpAbonoLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
