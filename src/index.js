import express from 'express';
import { env } from './config/env.js';
import { applySecurity } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errors.js';
import apiV1 from './routes/v1/index.js';
import { mountSwagger } from './swagger.js';

const app = express();

applySecurity(app);
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ ok: true }));
app.use('/api/v1', apiV1);

mountSwagger(app); // /docs

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API listening on :${env.port} (${env.nodeEnv})`);
});
