import fetch from 'node-fetch';

export type Rating = { source: 'Local' | 'RottenTomatoes'; value: number };

export class RatingsService {
  async fetchLocalRating(imdbId: string | null, internalId: number | null): Promise<number | null> {
    const base = process.env.RATINGS_API_BASE || 'http://localhost:3000';
    const mode = (process.env.RATINGS_API_MODE || 'imdb').toLowerCase();
    let url: string | null = null;
    if (mode === 'movieid' && internalId != null) {
      url = `${base}/ratings/${internalId}`;
    } else if (imdbId) {
      url = `${base}/ratings/${imdbId}`;
    }

    if (!url) return null;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      // Accept either array of rows or an object with average
      if (Array.isArray(data)) {
        const nums = data.map((r: any) => Number(r?.rating || r?.score)).filter((v) => !Number.isNaN(v));
        if (nums.length) return nums.reduce((a, b) => a + b, 0) / nums.length;
      } else if (typeof data === 'object' && data) {
        const v = Number((data as any).average ?? (data as any).rating ?? (data as any).score);
        if (!Number.isNaN(v)) return v;
      }
      return null;
    } catch {
      return null;
    }
  }

  async fetchRottenTomatoes(imdbId: string | null): Promise<number | null> {
    if (!imdbId) return null;
    const base = process.env.OMDB_API_BASE || 'https://www.omdbapi.com';
    const key = process.env.OMDB_API_KEY;
    console.log("OMDB_API_KEY:", key);
    if (!key) {
      console.log("No OMDB_API_KEY found, returning null");
      return null;
    }
    const url = `${base}/?apikey=${key}&i=${encodeURIComponent(imdbId)}`;
    console.log("OMDB URL:", url);
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json() as any;
      console.log("OMDB Response:", JSON.stringify(data, null, 2))
      const ratings = Array.isArray(data?.Ratings) ? data.Ratings : [];
      const rt = ratings.find((r: any) => r?.Source === 'Rotten Tomatoes');
      if (rt?.Value && typeof rt.Value === 'string' && rt.Value.endsWith('%')) {
        const n = Number(rt.Value.replace('%', ''));
        return Number.isNaN(n) ? null : n;
      }
      return null;
    } catch {
      return null;
    }
  }
}
