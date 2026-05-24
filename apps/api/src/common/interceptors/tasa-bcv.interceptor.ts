import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TasaBcvService } from '../../modules/tasa-bcv/tasa-bcv.service';

export const TASA_BCV_REQUEST_KEY = 'tasaBcvActual';

/**
 * Interceptor que inyecta la tasa BCV vigente en el request
 * para uso en controllers/servicios downstream.
 */
@Injectable()
export class TasaBcvInterceptor implements NestInterceptor {
  constructor(private readonly tasaBcvService: TasaBcvService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    try {
      request[TASA_BCV_REQUEST_KEY] = await this.tasaBcvService.getTasaActual();
    } catch {
      request[TASA_BCV_REQUEST_KEY] = null;
    }
    return next.handle();
  }
}
