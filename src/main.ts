import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Token Holder Tracking API')
    .setDescription(
      `API for tracking token holders and their balances on the blockchain. Provides endpoints for holder information and manual sync triggers.`,
    )
    .setVersion('1.0')
    .addTag('holders', 'Token holder management endpoints')
    .addTag('sync', 'Blockchain synchronization endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
};

bootstrap();
