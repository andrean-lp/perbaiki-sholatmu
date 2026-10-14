import type {
  Surat,
  SuratDetail,
  TafsirDetail,
  Ayat,
  RandomAyat,
  AyatRange,
  TafsirAyat,
  SuratWithTafsir,
  CacheStats,
} from 'equran';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Isomorphic, Browser-Safe EQuran Client
 *
 * Menggunakan Simple CORS GET Request (tanpa custom header X-SDK-Name / Content-Type pada GET)
 * agar browser tidak memicu penolakan CORS Preflight (OPTIONS) dari server equran.id.
 * Dilengkapi in-memory caching (TTL 1 jam, auto-prune).
 */
export class BrowserSafeEQuran {
  private baseUrl: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(options: { baseUrl?: string; ttl?: number } = {}) {
    this.baseUrl = options.baseUrl ?? 'https://equran.id/api/v2';
    this.ttl = options.ttl ?? 60 * 60 * 1000; // 1 jam cache default
  }

  private async fetchApi<T>(endpoint: string, cacheKey?: string): Promise<T> {
    const now = Date.now();
    if (cacheKey && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (now < entry.expiry) {
        this.hits++;
        return entry.data as T;
      }
      this.cache.delete(cacheKey);
    }
    this.misses++;

    const url = `${this.baseUrl}${endpoint}`;
    // Simple CORS GET: hanya gunakan Accept header standar agar browser tidak melakukan preflight OPTIONS
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Permintaan API gagal (${response.status} ${response.statusText})`);
    }

    const json = await response.json();
    if (json.code !== 200 || !json.data) {
      throw new Error(json.message || 'Respon API tidak valid');
    }

    if (cacheKey) {
      if (this.cache.size >= 300) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(cacheKey, { data: json.data, expiry: now + this.ttl });
    }

    return json.data as T;
  }

  async getAllSurat(): Promise<Surat[]> {
    return this.fetchApi<Surat[]>('/surat', 'all_surat');
  }

  async getSurat(nomor: number): Promise<SuratDetail> {
    if (!Number.isInteger(nomor) || nomor < 1 || nomor > 114) {
      throw new Error(`Nomor surat tidak valid: ${nomor}. Harus antara 1 dan 114.`);
    }
    return this.fetchApi<SuratDetail>(`/surat/${nomor}`, `surat_${nomor}`);
  }

  async getTafsir(nomor: number): Promise<TafsirDetail> {
    if (!Number.isInteger(nomor) || nomor < 1 || nomor > 114) {
      throw new Error(`Nomor surat tidak valid: ${nomor}. Harus antara 1 dan 114.`);
    }
    return this.fetchApi<TafsirDetail>(`/tafsir/${nomor}`, `tafsir_${nomor}`);
  }

  async getAyat(suratNomor: number, ayatNomor: number): Promise<Ayat> {
    const surat = await this.getSurat(suratNomor);
    const found = surat.ayat.find((a) => a.nomorAyat === ayatNomor);
    if (!found) {
      throw new Error(`Ayat ${ayatNomor} tidak ditemukan pada Surat ${suratNomor}`);
    }
    return found;
  }

  async getAyatRange(suratNomor: number, from: number, to: number): Promise<AyatRange> {
    const surat = await this.getSurat(suratNomor);
    const ayat = surat.ayat.filter((a) => a.nomorAyat >= from && a.nomorAyat <= to);
    return {
      suratNomor: surat.nomor,
      suratNama: surat.nama,
      suratNamaLatin: surat.namaLatin,
      fromAyat: from,
      toAyat: to,
      ayat,
    };
  }

  async getTafsirAyat(suratNomor: number, ayatNomor: number): Promise<TafsirAyat> {
    const tafsir = await this.getTafsir(suratNomor);
    const tafsirAyat = tafsir.tafsir.find((t) => t.ayat === ayatNomor);
    if (!tafsirAyat) {
      throw new Error(`Tafsir ayat ${ayatNomor} tidak ditemukan pada Surat ${suratNomor}`);
    }
    return tafsirAyat;
  }

  async getRandomAyat(): Promise<RandomAyat> {
    const randomSuratNomor = Math.floor(Math.random() * 114) + 1;
    const surat = await this.getSurat(randomSuratNomor);
    const randomAyatIndex = Math.floor(Math.random() * surat.ayat.length);
    return {
      suratNomor: surat.nomor,
      suratNama: surat.nama,
      suratNamaLatin: surat.namaLatin,
      ayat: surat.ayat[randomAyatIndex],
    };
  }

  async getSuratWithTafsir(nomor: number): Promise<SuratWithTafsir> {
    const [surat, tafsir] = await Promise.all([this.getSurat(nomor), this.getTafsir(nomor)]);
    return { surat, tafsir };
  }

  clearCache(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getCacheStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

export const equran = new BrowserSafeEQuran();
export default equran;
export * from 'equran';
