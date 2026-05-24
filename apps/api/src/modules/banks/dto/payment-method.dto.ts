import { IsString, IsEnum, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { CurrencyCode, PaymentMethodType } from '@prisma/client';

export class CreatePaymentMethodDto {
  @IsString()
  @MaxLength(30)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(PaymentMethodType)
  type!: PaymentMethodType;

  @IsEnum(CurrencyCode)
  currency!: CurrencyCode;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
