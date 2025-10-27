import { describe, it, expect } from 'vitest';
import { MovieRepository } from '../src/repositories/movieRepository.js';

describe('MovieRepository init', () => {
  it('should open database (if present)', () => {
    const repo = new MovieRepository('./db/movies.db');
    expect(typeof repo.countAll()).toBe('number');
  });
});
