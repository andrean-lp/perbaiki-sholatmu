import React, { useState, useEffect } from "react";

export interface KajianWilayah {
  kabkotaId?: number;
  kabkota?: string;
  provinsiId?: number;
  provinsi?: string;
}

export interface KajianImage {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface KajianItem {
  id: string;
  tema: string;
  pemateri: string;
  pemateriId?: string;
  tanggal: string;
  eventDate?: string;
  hari?: string;
  waktu: string;
  lokasi: string;
  lokasiId?: string;
  lokasiLat?: number | null;
  lokasiLng?: number | null;
  kota: string;
  alamat?: string;
  penyelenggara?: string;
  penyelenggaraId?: string;
  wilayah?: KajianWilayah;
  caption?: string | null;
  image?: KajianImage;
  sourceUrl?: string | null;
  postedAt?: string;
}

export interface KajianPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface KajianAppProps {
  initialKajianList: KajianItem[];
  initialPagination: KajianPagination;
  initialCities: string[];
}

export default function KajianApp({
  initialKajianList,
  initialPagination,
  initialCities,
}: KajianAppProps) {
  const [kajianList, setKajianList] = useState<KajianItem[]>(initialKajianList || []);
  const [pagination, setPagination] = useState<KajianPagination>(initialPagination);
  const [cities, setCities] = useState<string[]>(initialCities || []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [filterType, setFilterType] = useState<"upcoming" | "all">("upcoming");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Kajian for Detail Modal
  const [selectedKajian, setSelectedKajian] = useState<KajianItem | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch Kajian from API
  async function fetchKajianData(
    page = 1,
    query = searchQuery,
    city = selectedCity,
    isUpcoming = filterType === "upcoming"
  ) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "24");

      if (query.trim()) params.set("q", query.trim());
      if (city) params.set("kota", city);
      if (isUpcoming) params.set("upcoming", "1");

      const res = await fetch(`https://equran.id/api/v2/kajian?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data dari server");
      const json = await res.json();

      if (json.data && Array.isArray(json.data)) {
        setKajianList(json.data);
        if (json.pagination) {
          setPagination(json.pagination);
        }
        setCurrentPage(page);

        // Update cities if needed
        if (cities.length <= 1) {
          const extracted = Array.from(
            new Set(json.data.map((k: KajianItem) => k.kota).filter(Boolean))
          ).sort() as string[];
          if (extracted.length > 0) setCities(extracted);
        }
      } else {
        setKajianList([]);
      }
    } catch (err) {
      setErrorMessage("Tidak dapat memuat jadwal kajian. Periksa koneksi internet Anda.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchKajianData(1, searchQuery, selectedCity, filterType === "upcoming");
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedCity, filterType]);

  // Pagination navigation
  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage) return;
    fetchKajianData(newPage, searchQuery, selectedCity, filterType === "upcoming");
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  // Format short date badge (e.g., "Rab, 28 Okt")
  const formatBadgeDate = (item: KajianItem) => {
    if (item.eventDate) {
      try {
        const d = new Date(item.eventDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("id-ID", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
        }
      } catch (_) {}
    }
    return item.tanggal ? item.tanggal.slice(0, 12) : "Info Jadwal";
  };

  // Copy kajian detail
  const handleCopyKajian = (item: KajianItem) => {
    const text = `Info Kajian Sunnah:
*${item.tema}*

• Pemateri: ${item.pemateri || "-"}
• Waktu: ${item.hari || ""}, ${item.tanggal || ""} (${item.waktu || "-"})
• Lokasi: ${item.lokasi || "-"} (${item.kota || "-"})
• Alamat: ${item.alamat || "-"}
• Penyelenggara: ${item.penyelenggara || "-"}
${item.sourceUrl ? `• Sumber: ${item.sourceUrl}` : ""}

Sumber: Perbaiki Sholatmu via EQuran.id`;

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="w-full">
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 mb-4 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Jadwal Kajian Terverifikasi</span>
          <span className="text-emerald-300">|</span>
          <span>Seluruh Indonesia</span>
          <span className="text-emerald-300">|</span>
          <span>API EQuran.id</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Info Kajian Sunnah
        </h1>

        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Jadwal kajian sunnah dari berbagai masjid dan majelis ilmu di Indonesia. Cari berdasarkan tema, pemateri, atau kota tempat tinggal Anda.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <svg
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              id="input-cari-kajian"
              name="input-cari-kajian"
              aria-label="Cari kajian berdasarkan tema, pemateri, atau masjid"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tema, pemateri, atau masjid..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                aria-label="Hapus kata kunci pencarian kajian"
              >
                ✕
              </button>
            )}
          </div>

          {/* City Dropdown */}
          <div className="w-full md:w-56 shrink-0">
            <label htmlFor="select-kota-kajian" className="sr-only">
              Pilih Kota Kajian
            </label>
            <select
              id="select-kota-kajian"
              name="select-kota-kajian"
              aria-label="Pilih Kota Kajian"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-pointer"
            >
              <option value="">Semua Kota</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Filter: Akan Datang vs Semua */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setFilterType("upcoming")}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === "upcoming"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Akan Datang
            </button>
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Counter Info */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            {isLoading ? (
              "Memperbarui daftar kajian..."
            ) : (
              <>
                <strong className="text-gray-900 font-semibold">{pagination.total}</strong> kajian ditemukan
              </>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Halaman {currentPage} dari {pagination.totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading overlay indicator */}
      {isLoading && (
        <div className="max-w-5xl mx-auto py-8 text-center text-gray-500">
          <svg className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm font-medium">Memuat jadwal kajian...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && kajianList.length === 0 && (
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Kajian Tidak Ditemukan</h3>
          <p className="text-sm text-gray-500 mb-4">
            Coba ubah kata kunci pencarian, pilih kota lain, atau klik tab "Semua".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCity("");
              setFilterType("all");
            }}
            className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Grid Card Kajian */}
      {!isLoading && kajianList.length > 0 && (
        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {kajianList.map((item) => {
              const badgeText = formatBadgeDate(item);
              const posterUrl = item.image?.url;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedKajian(item)}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer hover:border-gray-300"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-[4/3] bg-gray-900 overflow-hidden">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={item.tema}
                        loading="lazy"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-400">
                        <svg className="w-10 h-10 mb-2 opacity-40 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-xs text-center line-clamp-2 px-2 text-gray-300 font-medium">
                          {item.tema}
                        </span>
                      </div>
                    )}

                    {/* Date Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600/90 text-white backdrop-blur-md shadow-sm">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{badgeText}</span>
                      </span>
                    </div>
                  </div>

                  {/* Content body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title */}
                      <h3
                        className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-2"
                        title={item.tema}
                      >
                        {item.tema}
                      </h3>

                      {/* Pemateri */}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 mb-2">
                        <svg className="w-3.5 h-3.5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate">{item.pemateri || "Pemateri Sunnah"}</span>
                      </div>
                    </div>

                    {/* Metadata footer */}
                    <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                      {/* Waktu */}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          <polyline points="12 6 12 12 16 14" strokeWidth={2} strokeLinecap="round" />
                        </svg>
                        <span className="truncate">{item.waktu || "-"}</span>
                      </div>

                      {/* Lokasi */}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{item.kota || item.lokasi || "Indonesia"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Navigation */}
          {pagination.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-sm"
              >
                Sebelumnya
              </button>

              <div className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-800">
                {currentPage} / {pagination.totalPages}
              </div>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedKajian && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedKajian(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                  Detail Kajian Sunnah
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                  {selectedKajian.tema}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKajian(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Tutup detail kajian"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Poster Image */}
              {selectedKajian.image?.url && (
                <div className="rounded-2xl overflow-hidden bg-gray-900 max-h-96 flex items-center justify-center border border-gray-100">
                  <img
                    src={selectedKajian.image.url}
                    alt={selectedKajian.tema}
                    className="w-full h-auto object-contain max-h-96"
                  />
                </div>
              )}

              {/* Info Items List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-400 text-xs block mb-0.5">Pemateri</span>
                  <span className="font-semibold text-gray-900">{selectedKajian.pemateri || "-"}</span>
                </div>

                <div>
                  <span className="text-gray-400 text-xs block mb-0.5">Hari & Tanggal</span>
                  <span className="font-semibold text-gray-900">
                    {selectedKajian.hari ? `${selectedKajian.hari}, ` : ""}
                    {selectedKajian.tanggal || "-"}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 text-xs block mb-0.5">Waktu Pelaksanaan</span>
                  <span className="font-semibold text-gray-900">{selectedKajian.waktu || "-"}</span>
                </div>

                <div>
                  <span className="text-gray-400 text-xs block mb-0.5">Kota / Wilayah</span>
                  <span className="font-semibold text-gray-900">{selectedKajian.kota || "-"}</span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-gray-400 text-xs block mb-0.5">Masjid / Tempat</span>
                  <span className="font-semibold text-gray-900">{selectedKajian.lokasi || "-"}</span>
                </div>

                {selectedKajian.alamat && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 text-xs block mb-0.5">Alamat Lengkap</span>
                    <span className="text-gray-700">{selectedKajian.alamat}</span>
                  </div>
                )}

                {selectedKajian.penyelenggara && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 text-xs block mb-0.5">Penyelenggara</span>
                    <span className="text-gray-700">{selectedKajian.penyelenggara}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopyKajian(selectedKajian)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shadow-sm inline-flex items-center gap-1.5"
              >
                {copySuccess ? "✓ Tersalin ke Clipboard" : "Salin Info Kajian"}
              </button>

              <div className="flex items-center gap-3">
                {selectedKajian.sourceUrl && (
                  <a
                    href={selectedKajian.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>Lihat Sumber Postingan</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedKajian(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rujukan & Sumber Resmi */}
      <div className="max-w-5xl mx-auto mb-16 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Sumber Informasi Kajian Sunnah
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Data jadwal kajian disinkronkan secara berkala dari kanal informasi dakwah sunnah di Indonesia melalui API publik EQuran.id.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-4 text-xs font-semibold">
          <a
            href="https://equran.id/kajian"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
          >
            <span>Kajian EQuran.id</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
