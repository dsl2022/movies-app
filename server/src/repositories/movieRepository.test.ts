import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { MovieRepository, MovieRow } from './movieRepository.js';
import fs from 'fs';
import path from 'path';

describe('MovieRepository', () => {
  let db: Database.Database;
  let repo: MovieRepository;
  const testDbPath = path.join(process.cwd(), 'test.db');

  beforeAll(() => {
    // Create test database
    db = new Database(testDbPath);

    // Create movies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS movies (
        movieId INTEGER PRIMARY KEY,
        imdbId TEXT,
        title TEXT NOT NULL,
        overview TEXT,
        genres TEXT,
        releaseDate TEXT,
        budget INTEGER,
        runtime INTEGER,
        language TEXT,
        productionCompanies TEXT
      )
    `);

    // Insert test data
    const insert = db.prepare(`
      INSERT INTO movies (movieId, imdbId, title, overview, genres, releaseDate, budget, runtime, language, productionCompanies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Movie 1: Action movie from 2020
    insert.run(
      1,
      'tt0000001',
      'Test Action Movie',
      'An exciting action film',
      '[{"name":"Action"},{"name":"Adventure"}]',
      '2020-05-15',
      100000000,
      120,
      'en',
      '[{"name":"Warner Bros"},{"name":"Universal"}]'
    );

    // Movie 2: Drama from 2020
    insert.run(
      2,
      'tt0000002',
      'Test Drama',
      'A touching drama',
      '[{"name":"Drama"}]',
      '2020-08-20',
      50000000,
      110,
      'en',
      '[{"name":"Paramount"}]'
    );

    // Movie 3: Comedy from 2021
    insert.run(
      3,
      'tt0000003',
      'Funny Movie',
      'A hilarious comedy',
      '[{"name":"Comedy"}]',
      '2021-03-10',
      30000000,
      95,
      'en',
      '[{"name":"Sony Pictures"}]'
    );

    // Movie 4: Action movie from 2021
    insert.run(
      4,
      'tt0000004',
      'Another Action Film',
      'More action packed fun',
      '[{"name":"Action"},{"name":"Thriller"}]',
      '2021-11-25',
      150000000,
      140,
      'en',
      '[{"name":"Marvel Studios"}]'
    );

    // Movie 5: Drama from 2019
    insert.run(
      5,
      null,
      'Old Drama',
      'Classic drama',
      '[{"name":"Drama"}]',
      '2019-01-05',
      20000000,
      105,
      'en',
      null
    );

    repo = new MovieRepository(testDbPath);
  });

  afterAll(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('countAll', () => {
    it('should return total count of all movies', () => {
      const count = repo.countAll();
      expect(count).toBe(5);
    });
  });

  describe('listAll', () => {
    it('should return movies with pagination', () => {
      const movies = repo.listAll(0, 2);
      expect(movies).toHaveLength(2);
      expect(movies[0].title).toBeDefined();
    });

    it('should respect offset parameter', () => {
      const firstPage = repo.listAll(0, 2);
      const secondPage = repo.listAll(2, 2);

      expect(firstPage[0].movieId).not.toBe(secondPage[0].movieId);
    });

    it('should respect limit parameter', () => {
      const movies = repo.listAll(0, 3);
      expect(movies).toHaveLength(3);
    });

    it('should order by releaseDate ASC', () => {
      const movies = repo.listAll(0, 5);
      expect(movies[0].releaseDate).toBe('2019-01-05');
      expect(movies[4].releaseDate).toBe('2021-11-25');
    });
  });

  describe('findByImdbId', () => {
    it('should find movie by valid IMDB ID', () => {
      const movie = repo.findByImdbId('tt0000001');
      expect(movie).toBeDefined();
      expect(movie?.title).toBe('Test Action Movie');
      expect(movie?.imdbId).toBe('tt0000001');
    });

    it('should return undefined for non-existent IMDB ID', () => {
      const movie = repo.findByImdbId('tt9999999');
      expect(movie).toBeUndefined();
    });

    it('should handle movies without IMDB ID', () => {
      const movie = repo.findById(5);
      expect(movie).toBeDefined();
      expect(movie?.imdbId).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find movie by valid movie ID', () => {
      const movie = repo.findById(1);
      expect(movie).toBeDefined();
      expect(movie?.movieId).toBe(1);
      expect(movie?.title).toBe('Test Action Movie');
    });

    it('should return undefined for non-existent movie ID', () => {
      const movie = repo.findById(999);
      expect(movie).toBeUndefined();
    });

    it('should return complete movie data', () => {
      const movie = repo.findById(1);
      expect(movie).toBeDefined();
      expect(movie?.overview).toBe('An exciting action film');
      expect(movie?.genres).toContain('Action');
      expect(movie?.releaseDate).toBe('2020-05-15');
      expect(movie?.budget).toBe(100000000);
      expect(movie?.runtime).toBe(120);
      expect(movie?.language).toBe('en');
      expect(movie?.productionCompanies).toBeDefined();
    });
  });

  describe('countByYear', () => {
    it('should count movies released in 2020', () => {
      const count = repo.countByYear(2020);
      expect(count).toBe(2);
    });

    it('should count movies released in 2021', () => {
      const count = repo.countByYear(2021);
      expect(count).toBe(2);
    });

    it('should count movies released in 2019', () => {
      const count = repo.countByYear(2019);
      expect(count).toBe(1);
    });

    it('should return 0 for year with no movies', () => {
      const count = repo.countByYear(2025);
      expect(count).toBe(0);
    });
  });

  describe('listByYear', () => {
    it('should list movies for specific year', () => {
      const movies = repo.listByYear(2020, 0, 10, 'asc');
      expect(movies).toHaveLength(2);
      expect(movies.every(m => m.releaseDate?.startsWith('2020'))).toBe(true);
    });

    it('should order movies ASC by default', () => {
      const movies = repo.listByYear(2020, 0, 10, 'asc');
      expect(movies[0].releaseDate).toBe('2020-05-15');
      expect(movies[1].releaseDate).toBe('2020-08-20');
    });

    it('should order movies DESC when specified', () => {
      const movies = repo.listByYear(2020, 0, 10, 'desc');
      expect(movies[0].releaseDate).toBe('2020-08-20');
      expect(movies[1].releaseDate).toBe('2020-05-15');
    });

    it('should respect pagination for year filter', () => {
      const movies = repo.listByYear(2020, 0, 1, 'asc');
      expect(movies).toHaveLength(1);
    });

    it('should handle offset for year filter', () => {
      const firstMovie = repo.listByYear(2020, 0, 1, 'asc');
      const secondMovie = repo.listByYear(2020, 1, 1, 'asc');

      expect(firstMovie[0].movieId).not.toBe(secondMovie[0].movieId);
    });

    it('should return empty array for year with no movies', () => {
      const movies = repo.listByYear(2025, 0, 10, 'asc');
      expect(movies).toHaveLength(0);
    });
  });

  describe('countByGenre', () => {
    it('should count movies with Action genre', () => {
      const count = repo.countByGenre('Action');
      expect(count).toBe(2);
    });

    it('should count movies with Drama genre', () => {
      const count = repo.countByGenre('Drama');
      expect(count).toBe(2);
    });

    it('should count movies with Comedy genre', () => {
      const count = repo.countByGenre('Comedy');
      expect(count).toBe(1);
    });

    it('should be case-insensitive', () => {
      const countLower = repo.countByGenre('action');
      const countUpper = repo.countByGenre('ACTION');
      const countMixed = repo.countByGenre('AcTiOn');

      expect(countLower).toBe(2);
      expect(countUpper).toBe(2);
      expect(countMixed).toBe(2);
    });

    it('should return 0 for non-existent genre', () => {
      const count = repo.countByGenre('Horror');
      expect(count).toBe(0);
    });
  });

  describe('listByGenre', () => {
    it('should list movies with Action genre', () => {
      const movies = repo.listByGenre('Action', 0, 10);
      expect(movies).toHaveLength(2);
      expect(movies.every(m => m.genres.includes('Action'))).toBe(true);
    });

    it('should list movies with Drama genre', () => {
      const movies = repo.listByGenre('Drama', 0, 10);
      expect(movies).toHaveLength(2);
      expect(movies.every(m => m.genres.includes('Drama'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      const moviesLower = repo.listByGenre('action', 0, 10);
      const moviesUpper = repo.listByGenre('ACTION', 0, 10);

      expect(moviesLower).toHaveLength(2);
      expect(moviesUpper).toHaveLength(2);
    });

    it('should respect pagination', () => {
      const movies = repo.listByGenre('Action', 0, 1);
      expect(movies).toHaveLength(1);
    });

    it('should handle offset', () => {
      const firstMovie = repo.listByGenre('Action', 0, 1);
      const secondMovie = repo.listByGenre('Action', 1, 1);

      expect(firstMovie[0].movieId).not.toBe(secondMovie[0].movieId);
    });

    it('should return empty array for non-existent genre', () => {
      const movies = repo.listByGenre('Horror', 0, 10);
      expect(movies).toHaveLength(0);
    });

    it('should order by releaseDate ASC', () => {
      const movies = repo.listByGenre('Action', 0, 10);
      expect(movies[0].releaseDate).toBe('2020-05-15');
      expect(movies[1].releaseDate).toBe('2021-11-25');
    });
  });

  describe('data integrity', () => {
    it('should return consistent data types', () => {
      const movie = repo.findById(1);

      expect(movie).toBeDefined();
      expect(typeof movie?.movieId).toBe('number');
      expect(typeof movie?.title).toBe('string');
      expect(movie?.imdbId === null || typeof movie?.imdbId === 'string').toBe(true);
      expect(movie?.overview === null || typeof movie?.overview === 'string').toBe(true);
      expect(typeof movie?.genres).toBe('string');
      expect(movie?.releaseDate === null || typeof movie?.releaseDate === 'string').toBe(true);
      expect(movie?.budget === null || typeof movie?.budget === 'number').toBe(true);
      expect(movie?.runtime === null || typeof movie?.runtime === 'number').toBe(true);
    });

    it('should handle null values correctly', () => {
      const movie = repo.findById(5);

      expect(movie).toBeDefined();
      expect(movie?.imdbId).toBeNull();
      expect(movie?.productionCompanies).toBeNull();
    });
  });
});
