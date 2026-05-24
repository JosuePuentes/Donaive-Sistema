import { IsNumber, IsOptional, IsString, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class AperturaCajaDto {
  @IsNumber()
  @Min(0)
  montoAperturaUsd!: number;

  @IsNumber()
  @Min(0)
  montoAperturaVes!: number;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ArqueoLineaDto {
  @IsString()
  paymentMethodId!: string;

  @IsNumber()
  @Min(0)
  montoDeclaradoUsd!: number;

  @IsNumber()
  @Min(0)
  montoDeclaradoVes!: number;
}

export class CierreCajaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArqueoLineaDto)
  lineas!: ArqueoLineaDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
