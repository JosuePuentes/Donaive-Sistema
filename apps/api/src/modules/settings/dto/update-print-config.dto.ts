import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaperType } from '@prisma/client';

export class UpdatePrintConfigDto {
  @IsOptional()
  @IsEnum(PaperType)
  tipoPapel?: PaperType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreEmpresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  mensajePersonalizado?: string | null;

  @IsOptional()
  @IsBoolean()
  mostrarTasaBcv?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrarPreciosBs?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrarCajero?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrarLogo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  piePagina?: string | null;
}
