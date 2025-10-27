import { MovieRepository } from '../repositories/movieRepository.js';
import { RatingsService, Rating } from './ratingsService.js';

export type MovieListItem = {
  imdbId: string | null;
  title: string;
  genres: string[];
  releaseDate: string | null;
  budget: { raw: number | null; usd: string | null };
};

export type MovieDetails = {
  imdbId: string | null;
  title: string;
  description: string | null;
  releaseDate: string | null;
  budget: { raw: number | null; usd: string | null };
  runtime: number | null;
  averageRating: number | null;
  ratings: Rating[];
  genres: string[];
  originalLanguage: string | null;
  productionCompanies: string[];
};

function parseGenres(genresJson: string | null | undefined): string[] {
  if (!genresJson) return [];
  try {
    const arr = JSON.parse(genresJson);
    if (Array.isArray(arr)) {
      return arr.map((g: any) => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
    }
  } catch {}
  return [];
}

function parseCompanies(companiesJson: string | null | undefined): string[] {
  if (!companiesJson) return [];
  try {
    const arr = JSON.parse(companiesJson);
    if (Array.isArray(arr)) {
      return arr.map((c: any) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
    }
  } catch {}
  return [];
}

function formatUSD(n: number | null | undefined): string | null {
  if (typeof n !== 'number') return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export class MovieService {
  private currency = (n: number | null) => ({ raw: n ?? null, usd: formatUSD(n ?? null) });

  constructor(private repo: MovieRepository, private ratings: RatingsService) {}

  listAll(page: number, perPage: number) {
    const total = this.repo.countAll();
    const offset = (page - 1) * perPage;
    const rows = this.repo.listAll(offset, perPage);
    const items: MovieListItem[] = rows.map((r) => ({
      imdbId: r.imdbId,
      title: r.title,
      genres: parseGenres(r.genres),
      releaseDate: r.releaseDate,
      budget: this.currency(r.budget)
    }));
    return { page, perPage, total, items };
  }

  async details(imdbId: string) {
    const row = this.repo.findByImdbId(imdbId);
    if (!row) return null;
    const local = await this.ratings.fetchLocalRating(row.imdbId, row.movieId);
    const rt = await this.ratings.fetchRottenTomatoes(row.imdbId);
    console.log("test rt",rt)
    const ratings: Rating[] = [];
    if (local != null) ratings.push({ source: 'Local', value: Number(local.toFixed(2)) });
    if (rt != null) ratings.push({ source: 'RottenTomatoes', value: rt });

    const avg = ratings.length ? Number((ratings.reduce((a, b) => a + b.value, 0) / ratings.length).toFixed(2)) : null;

    const details: MovieDetails = {
      imdbId: row.imdbId,
      title: row.title,
      description: row.overview ?? null,
      releaseDate: row.releaseDate,
      budget: this.currency(row.budget),
      runtime: row.runtime ?? null,
      averageRating: avg,
      ratings,
      genres: parseGenres(row.genres),
      originalLanguage: row.language ?? null,
      productionCompanies: parseCompanies(row.productionCompanies)
    };
    return details;
  }

  listByYear(year: number, page: number, perPage: number, order: 'asc'|'desc') {
    const total = this.repo.countByYear(year);
    const offset = (page - 1) * perPage;
    const rows = this.repo.listByYear(year, offset, perPage, order);
    const items: MovieListItem[] = rows.map((r) => ({
      imdbId: r.imdbId,
      title: r.title,
      genres: parseGenres(r.genres),
      releaseDate: r.releaseDate,
      budget: this.currency(r.budget)
    }));
    return { page, perPage, total, items };
  }

  listByGenre(genre: string, page: number, perPage: number) {
    const total = this.repo.countByGenre(genre);
    const offset = (page - 1) * perPage;
    const rows = this.repo.listByGenre(genre, offset, perPage);
    const items: MovieListItem[] = rows.map((r) => ({
      imdbId: r.imdbId,
      title: r.title,
      genres: parseGenres(r.genres),
      releaseDate: r.releaseDate,
      budget: this.currency(r.budget)
    }));
    return { page, perPage, total, items };
  }
}
