import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the server root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('Environment variables loaded:');
console.log('OMDB_API_KEY:', process.env.OMDB_API_KEY);
console.log('RATINGS_API_BASE:', process.env.RATINGS_API_BASE);
console.log('RATINGS_API_MODE:', process.env.RATINGS_API_MODE);

import express from 'express';
import moviesRouter from './routes/movies.js';
import cors from 'cors';

const app = express();

// Enable CORS for local dev (adjust allowed origins as needed)
app.use(cors({
  origin: (_origin: any, cb: (arg0: null, arg1: boolean) => void) => cb(null, true), // allow all in dev
  credentials: false
}));
app.options('*', cors()); // preflight

app.use(express.json());

app.get('/api/heartbeat', (_req, res) => res.json({ ok: true, service: 'movie-api-backend' }));
app.use('/api/movies', moviesRouter);

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`[movie-api] listening on http://localhost:${PORT}`);
});
