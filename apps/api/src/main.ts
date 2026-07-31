import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  /** Ensure storage directories exist */
  const storagePath = path.join(process.cwd(), 'storage', 'reels');
  const templatesPath = path.join(process.cwd(), 'storage', 'templates');
  fs.mkdirSync(storagePath, { recursive: true });
  fs.mkdirSync(templatesPath, { recursive: true });

  /** Serve rendered reels as static files */
  app.useStaticAssets(path.join(process.cwd(), 'storage'), {
    prefix: '/storage/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

