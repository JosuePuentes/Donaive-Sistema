import { IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateLineItemDto {
  @IsNumber()
  @Min(0)
  unitPriceUsd!: number;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  exchangeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  tasaBcvMomento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountUsd?: number;
}
