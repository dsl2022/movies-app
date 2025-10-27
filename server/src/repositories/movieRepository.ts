import Database from 'better-sqlite3';

export type MovieRow = {
  movieId: number;
  imdbId: string | null;
  title: string;
  overview?: string | null;
  genres: string; // JSON array as text
  releaseDate: string | null; // 'YYYY-MM-DD'
  budget: number | null;
  runtime: number | null;
  language?: string | null;
  productionCompanies?: string | null; // JSON as text
};

export class MovieRepository {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  countAll(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM movies').get() as any;
    return row.c as number;
  }

  listAll(offset: number, limit: number): MovieRow[] {
    return this.db.prepare('SELECT * FROM movies ORDER BY releaseDate ASC LIMIT ? OFFSET ?')
      .all(limit, offset) as MovieRow[];
  }

  findByImdbId(imdbId: string): MovieRow | undefined {
    return this.db.prepare('SELECT * FROM movies WHERE imdbId = ?').get(imdbId) as MovieRow | undefined;
  }

  findById(id: number): MovieRow | undefined {
    return this.db.prepare('SELECT * FROM movies WHERE movieId = ?').get(id) as MovieRow | undefined;
  }

  countByYear(year: number): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM movies WHERE substr(releaseDate,1,4)=?')
      .get(String(year)) as any;
    return row.c as number;
  }

  listByYear(year: number, offset: number, limit: number, order: 'asc'|'desc'): MovieRow[] {
    const dir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return this.db.prepare(`
      SELECT * FROM movies
      WHERE substr(releaseDate,1,4)=?
      ORDER BY releaseDate ${dir}
      LIMIT ? OFFSET ?
    `).all(String(year), limit, offset) as MovieRow[];
  }

  countByGenre(genre: string): number {
    const pattern = `%\"name\":\"${genre.toLowerCase()}\"%`;
    const row = this.db.prepare(
      "SELECT COUNT(*) as c FROM movies WHERE lower(replace(genres,' ','')) LIKE ?"
    ).get(pattern) as any;
    return (row?.c ?? 0) as number;
  }
  
  listByGenre(genre: string, offset: number, limit: number): MovieRow[] {
    const pattern = `%\"name\":\"${genre.toLowerCase()}\"%`;
    return this.db.prepare(
      "SELECT * FROM movies WHERE lower(replace(genres,' ','')) LIKE ? ORDER BY releaseDate ASC LIMIT ? OFFSET ?"
    ).all(pattern, limit, offset) as MovieRow[];
  }
}
