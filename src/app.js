import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';
import { attachRequestContext } from './middleware/auth.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const frontendDistDir = path.resolve(currentDir, '..', 'frontend', 'dist');
const frontendIndexFile = path.join(frontendDistDir, 'index.html');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': null
      }
    }
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(attachRequestContext);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1', apiRouter);
app.use(express.static(frontendDistDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }

  if (!fs.existsSync(frontendIndexFile)) {
    return next();
  }

  return res.sendFile(frontendIndexFile);
});

app.use(notFoundHandler);
app.use(errorHandler);
