import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { PrismaService } from './modules/database/prisma.service';

async function bootstrap() {
  console.log('Bootstrapping Nest API...');
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true
  });

  app.setGlobalPrefix('api', {
    exclude: ['health']
  });
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true }));

  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  const clientPath = join(__dirname, '..', 'client');
  if (existsSync(clientPath)) {
    app.useStaticAssets(clientPath);

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('*', (req: { path: string; method: string }, res: any, next: () => void) => {
      if (req.method !== 'GET') {
        return next();
      }
      if (
        req.path.startsWith('/api') ||
        req.path === '/health' ||
        req.path.startsWith('/metrics') ||
        req.path.startsWith('/prometheus')
      ) {
        return next();
      }
      if (req.path.includes('.')) {
        return next();
      }

      const normalized = req.path.replace(/\/+$/, '');
      const relative = normalized === '' ? 'index' : normalized.replace(/^\//, '');
      const htmlFile = join(clientPath, `${relative}.html`);

      if (existsSync(htmlFile)) {
        return res.sendFile(htmlFile);
      }

      const notFoundFile = join(clientPath, '404.html');
      if (existsSync(notFoundFile)) {
        return res.status(404).sendFile(notFoundFile);
      }

      return res.status(404).send('Not Found');
    });
  }

  const port = Number.parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
