import { IsString, IsEmail, IsArray, IsOptional, MinLength, MaxLength } from 'class-validator';
import { RoleCode } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  branchId!: string;

  @IsArray()
  roles!: RoleCode[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsArray()
  roles?: RoleCode[];
}
