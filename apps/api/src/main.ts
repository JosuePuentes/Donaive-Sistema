import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configService = app.get(ConfigService);
  const port = Number(process.env.PORT ?? configService.get<string>('API_PORT') ?? 3001);

  const corsRaw =
    process.env.CORS_ORIGIN ??
    configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const corsOrigins = corsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.listen(port);
  console.log(`🚀 API Donaive — puerto ${port}`);
  console.log(`   CORS: ${corsOrigins.join(' | ')}`);
}

bootstrap();
