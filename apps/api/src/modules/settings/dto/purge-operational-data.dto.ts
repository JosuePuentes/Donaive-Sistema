import { IsString, Equals } from 'class-validator';

export class PurgeOperationalDataDto {
  @IsString()
  @Equals('BORRAR_DATOS')
  confirm!: 'BORRAR_DATOS';
}
