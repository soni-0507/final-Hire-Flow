import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openapi } from './config/swagger.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';
import routes from './routes/index.js';

const app = express();
app.set('trust proxy', 1);

// Swagger UI is mounted before helmet so its assets are not blocked by the default CSP.
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Hiring Pipeline API' }));
app.get('/api/docs.json', (_req, res) => res.json(openapi));

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '100kb' }));
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);

export default app;
