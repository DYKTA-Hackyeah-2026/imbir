import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import config from './config/config.js';
import { chatRouter } from './chat/routes.js';
import { createErrorHandler, notFoundHandler } from './http/errorHandler.js';
import { requestIdMiddleware } from './http/requestId.js';
import type { AssistantService } from './assistant/service.js';
import type { MatchmakingService } from './matchmaking/service.js';
import authRouter from './modules/auth/auth.routes.js';
import { createAssistantRouter } from './modules/assistant/assistant.routes.js';
import contentRouter from './modules/content/content.routes.js';
import llmRouter from './modules/llm-cache/llm-cache.routes.js';
import { openApiDocument } from './openapi.js';
import adminRouter from './routes/admin.routes.js';
import contactRouter from './routes/contact.routes.js';
import enumsRouter from './routes/enums.routes.js';
import healthRouter from './routes/health.routes.js';
import { createInnovationsRouter } from './routes/innovations.routes.js';
import { createMatchmakingRouter } from './routes/matchmaking.routes.js';
import problemReportsRouter from './routes/problem-reports.routes.js';
import testerRouter from './routes/tester.routes.js';
import usersRouter from './routes/users.routes.js';
import wizardRouter from './routes/wizard.routes.js';

export interface AppDependencies {
  matchmakingService: MatchmakingService;
  /** Present only when a database is reachable; the assistant needs PostgreSQL + pgvector. */
  assistantService?: AssistantService;
}

export function createApp(deps: AppDependencies): express.Express {
  const app = express();

  app.disable('x-powered-by');

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.isProduction ? [] : null,
        },
      },
    }),
  );

  const corsOrigin =
    config.corsOrigins.length > 0 ? config.corsOrigins : config.isProduction ? false : true;

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);

  app.get('/', (_req, res) => {
    res.json({
      name: 'HubMi Backend API',
      endpoints: {
        health: '/health',
        users: '/users',
        testEnums: '/test-enums',
        innovations: '/innovations',
        wizardOptions: '/innovations/options',
        tests: '/api/v1/tests',
        testerFeedback: '/api/v1/innovations/{innovationId}/tester-feedback',
        assistantMessages: '/api/assistant/messages',
        assistantSearch: '/api/assistant/searches/{searchId}',
        problemReports: '/api/v1/problem-reports',
        admin: '/api/v1/admin',
      },
    });
  });

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/content', contentRouter);
  app.use('/contact', contactRouter);
  app.use('/llm', llmRouter);
  app.use('/users', usersRouter);
  app.use('/api/v1/matchmaking', createMatchmakingRouter(deps.matchmakingService));
  app.use('/api/v1/innovations', createInnovationsRouter(deps.matchmakingService));
  if (deps.assistantService) {
    app.use('/api/assistant', createAssistantRouter(deps.assistantService));
  }
  app.use('/api/v1', testerRouter);
  app.use('/api/v1/problem-reports', problemReportsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/test-enums', enumsRouter);
  app.use('/enums', enumsRouter);
  app.use('/innovations', wizardRouter);

  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  if (config.adminPanelEnabled) {
    const publicDir = path.resolve(process.cwd(), 'public');
    app.use('/panel', express.static(publicDir, { extensions: ['html'] }));
  }

  app.use(notFoundHandler);
  app.use(
    createErrorHandler((error, requestId) => {
      const cause = error instanceof Error ? error.cause : undefined;
      const causeText = cause instanceof Error ? ` | cause: ${cause.message}` : '';
      process.stderr.write(`[api] error requestId=${requestId}: ${String(error)}${causeText}\n`);
    }),
  );

  return app;
}
