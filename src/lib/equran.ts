import { EQuran } from 'equran';

/**
 * Official EQuran.id SDK client instance
 * Dilengkapi built-in in-memory caching (TTL 1 jam, max 300 entries)
 */
export const equran = new EQuran({
  baseUrl: 'https://equran.id/api/v2',
  cache: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour cache
    maxSize: 300,
  },
});

export default equran;
export * from 'equran';
