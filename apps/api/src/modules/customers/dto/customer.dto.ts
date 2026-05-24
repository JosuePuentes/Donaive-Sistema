import { IsString, IsOptional, IsNumber, IsBoolean, Min, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rif?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimitUsd?: number;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  rif?: string | null;

  @IsOptional()
  @IsString()
  businessName?: string | null;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimitUsd?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
