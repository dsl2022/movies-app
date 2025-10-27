import { Router } from 'express';
import { z } from 'zod';
import { MovieRepository } from '../repositories/movieRepository.js';
import { MovieService, RatingsService } from '../services/movieService.js';

const router = Router();
const repo = new MovieRepository(process.env.DATABASE_PATH || './db/movies.db');
const ratings = new RatingsService(repo);
const svc = new MovieService(repo, ratings);

const PageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(200).default(50)
});

router.get('/', (req, res) => {
  const { page, perPage } = PageQuery.parse(req.query);
  const data = svc.listAll(page, perPage);
  res.json(data);
});

router.get('/year/:year', (req, res) => {
  const { page, perPage } = PageQuery.parse(req.query);
  const year = z.coerce.number().int().min(1800).max(3000).parse(req.params.year);
  const order = z.enum(['asc','desc']).default('asc').parse((req.query.order ?? 'asc').toString().toLowerCase());
  const data = svc.listByYear(year, page, perPage, order);
  res.json(data);
});

router.get('/genre/:genre', (req, res) => {
  const { page, perPage } = PageQuery.parse(req.query);
  const genre = z.string().min(1).parse(req.params.genre);
  const data = svc.listByGenre(genre, page, perPage);
  res.json(data);
});

router.get('/:imdbId', async (req, res) => {
  const imdbId = z.string().min(2).parse(req.params.imdbId);
  const data = await svc.details(imdbId);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

export default router;
