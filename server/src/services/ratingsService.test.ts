import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RatingsService } from './ratingsService.js';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('RatingsService', () => {
  let service: RatingsService;
  const originalEnv = process.env;

  beforeEach(() => {
    service = new RatingsService();
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('fetchLocalRating', () => {
    describe('with IMDB mode (default)', () => {
      beforeEach(() => {
        process.env.RATINGS_API_BASE = 'http://localhost:3000';
        process.env.RATINGS_API_MODE = 'imdb';
      });

      it('should fetch rating using IMDB ID', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { rating: 8.5 },
            { rating: 9.0 },
            { rating: 7.5 },
          ]),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/ratings/tt1234567');
        expect(rating).toBe(8.333333333333334); // Average of 8.5, 9.0, 7.5
      });

      it('should calculate average from array of ratings', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { rating: 10 },
            { rating: 10 },
          ]),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBe(10);
      });

      it('should handle score property in ratings array', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { score: 7.0 },
            { score: 8.0 },
          ]),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBe(7.5);
      });

      it('should handle object with average property', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ average: 8.7 }),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBe(8.7);
      });

      it('should handle object with rating property', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ rating: 9.2 }),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBe(9.2);
      });

      it('should handle object with score property', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ score: 6.5 }),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBe(6.5);
      });

      it('should return null if response is not ok', async () => {
        const mockResponse = {
          ok: false,
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBeNull();
      });

      it('should return null if no IMDB ID provided', async () => {
        const rating = await service.fetchLocalRating(null, 1);
        expect(rating).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return null on fetch error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBeNull();
      });

      it('should filter out invalid ratings', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { rating: 8.0 },
            { rating: NaN },
            { rating: 'invalid' },
            { rating: 7.0 },
          ]),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBe(7.5); // Average of 8.0 and 7.0 only
      });

      it('should return null if all ratings are invalid', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { rating: NaN },
            { rating: 'invalid' },
          ]),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 1);
        expect(rating).toBeNull();
      });
    });

    describe('with movieId mode', () => {
      beforeEach(() => {
        process.env.RATINGS_API_BASE = 'http://localhost:3000';
        process.env.RATINGS_API_MODE = 'movieid';
      });

      it('should use internal movie ID when mode is movieid', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ average: 7.5 }),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const rating = await service.fetchLocalRating('tt1234567', 42);

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/ratings/42');
        expect(rating).toBe(7.5);
      });

      it('should return null if no internal ID provided in movieid mode', async () => {
        const rating = await service.fetchLocalRating('tt1234567', null);
        expect(rating).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('with custom API base', () => {
      it('should use custom API base URL', async () => {
        process.env.RATINGS_API_BASE = 'https://api.example.com';
        process.env.RATINGS_API_MODE = 'imdb';

        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ average: 8.0 }),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await service.fetchLocalRating('tt1234567', 1);

        expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/ratings/tt1234567');
      });

      it('should use default localhost if no base URL provided', async () => {
        delete process.env.RATINGS_API_BASE;
        process.env.RATINGS_API_MODE = 'imdb';

        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ average: 8.0 }),
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await service.fetchLocalRating('tt1234567', 1);

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/ratings/tt1234567');
      });
    });
  });

  describe('fetchRottenTomatoes', () => {
    beforeEach(() => {
      process.env.OMDB_API_BASE = 'https://www.omdbapi.com';
      process.env.OMDB_API_KEY = 'test-api-key';
    });

    it('should fetch Rotten Tomatoes rating from OMDB', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Title: 'Test Movie',
          Ratings: [
            { Source: 'Internet Movie Database', Value: '8.5/10' },
            { Source: 'Rotten Tomatoes', Value: '85%' },
            { Source: 'Metacritic', Value: '80/100' },
          ],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.omdbapi.com/?apikey=test-api-key&i=tt1234567'
      );
      expect(rating).toBe(85);
    });

    it('should parse percentage correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [{ Source: 'Rotten Tomatoes', Value: '95%' }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBe(95);
    });

    it('should return null if Rotten Tomatoes rating not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [
            { Source: 'Internet Movie Database', Value: '8.5/10' },
            { Source: 'Metacritic', Value: '80/100' },
          ],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should return null if no IMDB ID provided', async () => {
      const rating = await service.fetchRottenTomatoes(null);
      expect(rating).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null if no API key provided', async () => {
      delete process.env.OMDB_API_KEY;

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null if response is not ok', async () => {
      const mockResponse = {
        ok: false,
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should handle empty Ratings array', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should handle missing Ratings property', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Title: 'Test Movie',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should return null if rating value is not a percentage', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [{ Source: 'Rotten Tomatoes', Value: '8.5/10' }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should return null if percentage is invalid', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [{ Source: 'Rotten Tomatoes', Value: 'N/A%' }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const rating = await service.fetchRottenTomatoes('tt1234567');
      expect(rating).toBeNull();
    });

    it('should URL encode IMDB ID', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [{ Source: 'Rotten Tomatoes', Value: '85%' }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await service.fetchRottenTomatoes('tt1234567');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('i=tt1234567')
      );
    });

    it('should use custom OMDB base URL', async () => {
      process.env.OMDB_API_BASE = 'https://custom-omdb.com';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Ratings: [{ Source: 'Rotten Tomatoes', Value: '85%' }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await service.fetchRottenTomatoes('tt1234567');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom-omdb.com')
      );
    });
  });
});
