import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: (_origin: any, cb: (arg0: null, arg1: boolean) => void) => cb(null, true), // allow all in dev
  credentials: false
}));
app.options('*', cors());

app.use(express.json());

app.get('/api/heartbeat', (_req, res) => res.json({ ok: true, service: 'movie-api-backend' }));
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`[movie-api] listening on http://localhost:${PORT}`);
});
