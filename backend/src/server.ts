import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import { isPostgresConfigured } from './config/db';
import { ensureDatabaseSchema } from './config/autoMigrate';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());

// Garante que as tabelas existam no Neon PostgreSQL na primeira requisição
app.use(async (_req, _res, next) => {
  if (isPostgresConfigured) {
    await ensureDatabaseSchema();
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    databaseMode: isPostgresConfigured ? 'PostgreSQL (Neon)' : 'Local JSON (Fallback)',
  });
});

app.use('/api/products', productRoutes);

// Em produção unificada (Render / Railway / VPS), serve o build do Frontend PWA automaticamente
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Meu Mercado rodando na porta ${PORT}`);
    console.log(
      `📦 Banco de Dados: ${
        isPostgresConfigured ? 'PostgreSQL (Neon)' : 'Local JSON (Fallback)'
      }`
    );
  });
}

export default app;
