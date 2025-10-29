import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovieService, MovieListItem, MovieDetails } from './movieService.js';
import { MovieRepository, MovieRow } from '../repositories/movieRepository.js';
import { RatingsService } from './ratingsService.js';

describe('MovieService', () => {
  let service: MovieService;
  let mockRepo: MovieRepository;
  let mockRatings: RatingsService;

  const createMockMovie = (overrides: Partial<MovieRow> = {}): MovieRow => ({
    movieId: 1,
    imdbId: 'tt1234567',
    title: 'Test Movie',
    overview: 'A test movie description',
    genres: '[{"name":"Action"},{"name":"Adventure"}]',
    releaseDate: '2020-05-15',
    budget: 100000000,
    runtime: 120,
    language: 'en',
    productionCompanies: '[{"name":"Warner Bros"},{"name":"Universal"}]',
    ...overrides,
  });

  beforeEach(() => {
    // Create mock repository
    mockRepo = {
      countAll: vi.fn(),
      listAll: vi.fn(),
      findByImdbId: vi.fn(),
      findById: vi.fn(),
      countByYear: vi.fn(),
      listByYear: vi.fn(),
      countByGenre: vi.fn(),
      listByGenre: vi.fn(),
    } as any;

    // Create mock ratings service
    mockRatings = {
      fetchLocalRating: vi.fn(),
      fetchRottenTomatoes: vi.fn(),
    } as any;

    service = new MovieService(mockRepo, mockRatings);
  });

  describe('listAll', () => {
    it('should return paginated list of movies', () => {
      const mockMovies = [
        createMockMovie({ movieId: 1, title: 'Movie 1' }),
        createMockMovie({ movieId: 2, title: 'Movie 2' }),
      ];

      vi.mocked(mockRepo.countAll).mockReturnValue(10);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 2);

      expect(mockRepo.countAll).toHaveBeenCalled();
      expect(mockRepo.listAll).toHaveBeenCalledWith(0, 2);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(2);
      expect(result.total).toBe(10);
      expect(result.items).toHaveLength(2);
    });

    it('should calculate correct offset for page 2', () => {
      vi.mocked(mockRepo.countAll).mockReturnValue(10);
      vi.mocked(mockRepo.listAll).mockReturnValue([]);

      service.listAll(2, 5);

      expect(mockRepo.listAll).toHaveBeenCalledWith(5, 5);
    });

    it('should calculate correct offset for page 3', () => {
      vi.mocked(mockRepo.countAll).mockReturnValue(10);
      vi.mocked(mockRepo.listAll).mockReturnValue([]);

      service.listAll(3, 10);

      expect(mockRepo.listAll).toHaveBeenCalledWith(20, 10);
    });

    it('should parse genres correctly', () => {
      const mockMovies = [createMockMovie()];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].genres).toEqual(['Action', 'Adventure']);
    });

    it('should format budget as USD', () => {
      const mockMovies = [createMockMovie({ budget: 100000000 })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].budget.raw).toBe(100000000);
      expect(result.items[0].budget.usd).toBe('$100,000,000');
    });

    it('should handle null budget', () => {
      const mockMovies = [createMockMovie({ budget: null })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].budget.raw).toBeNull();
      expect(result.items[0].budget.usd).toBeNull();
    });

    it('should handle empty genres', () => {
      const mockMovies = [createMockMovie({ genres: '' })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].genres).toEqual([]);
    });

    it('should handle malformed genres JSON', () => {
      const mockMovies = [createMockMovie({ genres: 'invalid json' })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].genres).toEqual([]);
    });

    it('should include all required fields in MovieListItem', () => {
      const mockMovies = [createMockMovie()];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);
      const item = result.items[0];

      expect(item).toHaveProperty('imdbId');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('genres');
      expect(item).toHaveProperty('releaseDate');
      expect(item).toHaveProperty('budget');
    });
  });

  describe('details', () => {
    it('should return movie details with ratings', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(8.5);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(85);

      const result = await service.details('tt1234567');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Movie');
      expect(result?.ratings).toHaveLength(2);
      expect(result?.ratings[0]).toEqual({ source: 'Local', value: 8.5 });
      expect(result?.ratings[1]).toEqual({ source: 'RottenTomatoes', value: 85 });
    });

    it('should calculate average rating correctly', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(8.0);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(90);

      const result = await service.details('tt1234567');

      expect(result?.averageRating).toBe(49); // (8.0 + 90) / 2 = 49
    });

    it('should round average rating to 2 decimal places', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(8.333);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(85);

      const result = await service.details('tt1234567');

      expect(result?.averageRating).toBe(46.67); // (8.333 + 85) / 2 ≈ 46.67
    });

    it('should handle only local rating', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(7.5);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.ratings).toHaveLength(1);
      expect(result?.ratings[0]).toEqual({ source: 'Local', value: 7.5 });
      expect(result?.averageRating).toBe(7.5);
    });

    it('should handle only Rotten Tomatoes rating', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(80);

      const result = await service.details('tt1234567');

      expect(result?.ratings).toHaveLength(1);
      expect(result?.ratings[0]).toEqual({ source: 'RottenTomatoes', value: 80 });
      expect(result?.averageRating).toBe(80);
    });

    it('should handle no ratings available', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.ratings).toHaveLength(0);
      expect(result?.averageRating).toBeNull();
    });

    it('should return null if movie not found', async () => {
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(undefined);

      const result = await service.details('tt9999999');

      expect(result).toBeNull();
      expect(mockRatings.fetchLocalRating).not.toHaveBeenCalled();
      expect(mockRatings.fetchRottenTomatoes).not.toHaveBeenCalled();
    });

    it('should parse genres array', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.genres).toEqual(['Action', 'Adventure']);
    });

    it('should parse production companies array', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.productionCompanies).toEqual(['Warner Bros', 'Universal']);
    });

    it('should handle null production companies', async () => {
      const mockMovie = createMockMovie({ productionCompanies: null });
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.productionCompanies).toEqual([]);
    });

    it('should format budget correctly', async () => {
      const mockMovie = createMockMovie({ budget: 50000000 });
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.budget.raw).toBe(50000000);
      expect(result?.budget.usd).toBe('$50,000,000');
    });

    it('should pass both imdbId and movieId to fetchLocalRating', async () => {
      const mockMovie = createMockMovie({ movieId: 42, imdbId: 'tt1234567' });
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(8.0);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      await service.details('tt1234567');

      expect(mockRatings.fetchLocalRating).toHaveBeenCalledWith('tt1234567', 42);
    });

    it('should round local rating to 2 decimal places', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(8.3456789);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      const result = await service.details('tt1234567');

      expect(result?.ratings[0].value).toBe(8.35);
    });

    it('should include all required fields in MovieDetails', async () => {
      const mockMovie = createMockMovie();
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(8.0);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(85);

      const result = await service.details('tt1234567');

      expect(result).toHaveProperty('imdbId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('releaseDate');
      expect(result).toHaveProperty('budget');
      expect(result).toHaveProperty('runtime');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('ratings');
      expect(result).toHaveProperty('genres');
      expect(result).toHaveProperty('originalLanguage');
      expect(result).toHaveProperty('productionCompanies');
    });
  });

  describe('listByYear', () => {
    it('should return paginated list of movies by year', () => {
      const mockMovies = [createMockMovie()];
      vi.mocked(mockRepo.countByYear).mockReturnValue(5);
      vi.mocked(mockRepo.listByYear).mockReturnValue(mockMovies);

      const result = service.listByYear(2020, 1, 10, 'asc');

      expect(mockRepo.countByYear).toHaveBeenCalledWith(2020);
      expect(mockRepo.listByYear).toHaveBeenCalledWith(2020, 0, 10, 'asc');
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(5);
      expect(result.items).toHaveLength(1);
    });

    it('should support descending order', () => {
      vi.mocked(mockRepo.countByYear).mockReturnValue(5);
      vi.mocked(mockRepo.listByYear).mockReturnValue([]);

      service.listByYear(2020, 1, 10, 'desc');

      expect(mockRepo.listByYear).toHaveBeenCalledWith(2020, 0, 10, 'desc');
    });

    it('should calculate correct offset', () => {
      vi.mocked(mockRepo.countByYear).mockReturnValue(10);
      vi.mocked(mockRepo.listByYear).mockReturnValue([]);

      service.listByYear(2020, 3, 5, 'asc');

      expect(mockRepo.listByYear).toHaveBeenCalledWith(2020, 10, 5, 'asc');
    });

    it('should parse and format movie data correctly', () => {
      const mockMovies = [createMockMovie({ budget: 75000000 })];
      vi.mocked(mockRepo.countByYear).mockReturnValue(1);
      vi.mocked(mockRepo.listByYear).mockReturnValue(mockMovies);

      const result = service.listByYear(2020, 1, 10, 'asc');

      expect(result.items[0].genres).toEqual(['Action', 'Adventure']);
      expect(result.items[0].budget.usd).toBe('$75,000,000');
    });
  });

  describe('listByGenre', () => {
    it('should return paginated list of movies by genre', () => {
      const mockMovies = [createMockMovie()];
      vi.mocked(mockRepo.countByGenre).mockReturnValue(8);
      vi.mocked(mockRepo.listByGenre).mockReturnValue(mockMovies);

      const result = service.listByGenre('Action', 1, 10);

      expect(mockRepo.countByGenre).toHaveBeenCalledWith('Action');
      expect(mockRepo.listByGenre).toHaveBeenCalledWith('Action', 0, 10);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(8);
      expect(result.items).toHaveLength(1);
    });

    it('should calculate correct offset', () => {
      vi.mocked(mockRepo.countByGenre).mockReturnValue(10);
      vi.mocked(mockRepo.listByGenre).mockReturnValue([]);

      service.listByGenre('Drama', 2, 5);

      expect(mockRepo.listByGenre).toHaveBeenCalledWith('Drama', 5, 5);
    });

    it('should parse and format movie data correctly', () => {
      const mockMovies = [
        createMockMovie({
          genres: '[{"name":"Drama"},{"name":"Romance"}]',
          budget: 25000000,
        }),
      ];
      vi.mocked(mockRepo.countByGenre).mockReturnValue(1);
      vi.mocked(mockRepo.listByGenre).mockReturnValue(mockMovies);

      const result = service.listByGenre('Drama', 1, 10);

      expect(result.items[0].genres).toEqual(['Drama', 'Romance']);
      expect(result.items[0].budget.usd).toBe('$25,000,000');
    });
  });

  describe('edge cases', () => {
    it('should handle genres as string array (not objects)', () => {
      const mockMovies = [createMockMovie({ genres: '["Action","Drama"]' })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].genres).toEqual(['Action', 'Drama']);
    });

    it('should filter out falsy genre values', () => {
      const mockMovies = [
        createMockMovie({ genres: '[{"name":"Action"},{"name":""},{"name":null}]' }),
      ];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].genres).toEqual(['Action']);
    });

    it('should handle undefined overview', () => {
      const mockMovie = createMockMovie({ overview: undefined });
      vi.mocked(mockRepo.findByImdbId).mockReturnValue(mockMovie);
      vi.mocked(mockRatings.fetchLocalRating).mockResolvedValue(null);
      vi.mocked(mockRatings.fetchRottenTomatoes).mockResolvedValue(null);

      return expect(service.details('tt1234567')).resolves.toHaveProperty('description', null);
    });

    it('should handle zero budget', () => {
      const mockMovies = [createMockMovie({ budget: 0 })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].budget.raw).toBe(0);
      expect(result.items[0].budget.usd).toBe('$0');
    });

    it('should handle very large budgets', () => {
      const mockMovies = [createMockMovie({ budget: 999999999 })];
      vi.mocked(mockRepo.countAll).mockReturnValue(1);
      vi.mocked(mockRepo.listAll).mockReturnValue(mockMovies);

      const result = service.listAll(1, 10);

      expect(result.items[0].budget.usd).toBe('$1,000,000,000');
    });
  });
});
