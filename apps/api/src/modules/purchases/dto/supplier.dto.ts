import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(20)
  rif!: string;

  @IsString()
  @MaxLength(200)
  businessName!: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactName?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  isActive?: boolean;
}
