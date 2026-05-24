import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ExchangeRateSource } from '@prisma/client';

export class CreateTasaBcvDto {
  @IsDateString()
  fecha!: string;

  @IsNumber()
  @Min(0.000001)
  montoBs!: number;

  @IsOptional()
  @IsEnum(ExchangeRateSource)
  fuente?: ExchangeRateSource;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class UpsertTasaBcvHoyDto {
  @IsNumber()
  @Min(0.000001)
  montoBs!: number;

  @IsOptional()
  @IsEnum(ExchangeRateSource)
  fuente?: ExchangeRateSource;

  @IsOptional()
  @IsString()
  notas?: string;
}
