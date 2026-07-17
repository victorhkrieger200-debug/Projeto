import express from 'express';
import cors from 'cors';
import { loadEnvFile } from './lib/env.js';
import authRoutes from './routes/authRoutes.js';

loadEnvFile();

const app = express();
const port = Number(process.env.PORT) || 4000;
const isProduction = process.env.NODE_ENV === 'production';

function parseAllowedOrigins() {
  return (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

function resolveCorsOrigin(origin, callback) {
  if (!origin && !isProduction) {
    callback(null, true);
    return;
  }

  if (origin && allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Origem não autorizada pela política de CORS.'));
}

function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
    const key = `${ip || req.ip || req.socket.remoteAddress}:${req.path}`;
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
});

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors({ origin: resolveCorsOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'atlhon-backend' });
});

app.use('/api/auth', authRateLimiter, authRoutes);

app.use((err, _req, res, _next) => {
  if (err?.message?.includes('CORS')) {
    res.status(403).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
