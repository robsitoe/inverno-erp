import { NestFactory } from '@nestjs/core';
// Trigger restart v2
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { seedDatabase } from './seed-data';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS — restrict to configured origins in production.
  // Set ALLOWED_ORIGINS as a comma-separated list (e.g. "https://erp.cliente.co.mz").
  // If unset, reflects the request origin (convenient for self-hosted LAN/dev).
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(o => o.trim()).filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-company-id',
  });

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Inverno ERP API')
    .setDescription('The Inverno ERP API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Seed database with default data
  const dataSource = app.get(DataSource);
  await seedDatabase(dataSource);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

