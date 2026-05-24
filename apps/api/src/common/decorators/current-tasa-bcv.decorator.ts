import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TASA_BCV_REQUEST_KEY } from '../interceptors/tasa-bcv.interceptor';
import type { TasaBcvActual } from '../../modules/tasa-bcv/tasa-bcv.service';

/** Extrae la tasa BCV inyectada por TasaBcvInterceptor */
export const CurrentTasaBcv = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TasaBcvActual | null => {
    const request = ctx.switchToHttp().getRequest();
    return request[TASA_BCV_REQUEST_KEY] ?? null;
  },
);
