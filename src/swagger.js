import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'WhatIf FC API', version: '1.0.0' },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['./src/routes/v1/*.js'],
};

export function mountSwagger(app) {
  const spec = swaggerJsdoc(options);

  // Sadece /docs için daha gevşek CSP
  const docs = express.Router();
  docs.use((req, res, next) => {
    // Swagger UI inline script/style kullanıyor → izin ver
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' https: 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
    );
    next();
  });

  app.use('/docs', docs, swaggerUi.serve, swaggerUi.setup(spec));
  // JSON'u hızlı teşhis için:
  app.get('/docs-json', (_req, res) => res.json(spec));
}
