import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { BankScope } from '@prisma/client';

export class CreateBankDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(BankScope)
  scope?: BankScope;
}

export class CreateBankAccountDto {
  @IsString()
  bankId!: string;

  @IsString()
  accountNumber!: string;

  @IsString()
  accountName!: string;

  @IsString()
  accountType!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
