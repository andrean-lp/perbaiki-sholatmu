import React, { useState, useMemo, useEffect } from 'react';

export interface DoaItem {
  id: number;
  grup: string;
  nama: string;
  ar: string;
  tr: string;
  idn: string;
  tentang: string;
  tag: string[];
}

interface DoaAppProps {
  initialDoaList: DoaItem[];
}

export default function DoaApp({ initialDoaList }: DoaAppProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedDoa, setSelectedDoa] = useState<DoaItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);

  // Extract unique categories & tags
  const categories = useMemo(() => {
    const set = new Set<string>();
    initialDoaList.forEach((d) => {
      if (d.grup) set.add(d.grup.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [initialDoaList]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    initialDoaList.forEach((d) => {
      if (Array.isArray(d.tag)) {
        d.tag.forEach((t) => t && set.add(t.trim()));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [initialDoaList]);

  // Filtered items
  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialDoaList.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.grup !== selectedCategory) {
        return false;
      }
      // Tag filter
      if (selectedTag !== 'all' && (!Array.isArray(item.tag) || !item.tag.includes(selectedTag))) {
        return false;
      }
      // Search query
      if (q) {
        const inNama = item.nama?.toLowerCase().includes(q);
        const inIdn = item.idn?.toLowerCase().includes(q);
        const inTr = item.tr?.toLowerCase().includes(q);
        const inGrup = item.grup?.toLowerCase().includes(q);
        const inTag = Array.isArray(item.tag) && item.tag.some((t) => t.toLowerCase().includes(q));
        return inNama || inIdn || inTr || inGrup || inTag;
      }
      return true;
    });
  }, [initialDoaList, search, selectedCategory, selectedTag]);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(24);
  }, [search, selectedCategory, selectedTag]);

  const displayedList = useMemo(() => {
    return filteredList.slice(0, visibleCount);
  }, [filteredList, visibleCount]);

  const handleCopy = (item: DoaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const textToCopy = `${item.nama}\n\n${item.ar}\n\nArtinya:\n"${item.idn}"\n\n(${item.tentang || 'Kumpulan Doa Harian'})\nSumber: perbaiki-sholatmu.andrean.web.id/doa`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleShare = async (item: DoaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareData = {
      title: item.nama,
      text: `${item.nama}\n\n${item.ar}\n\nArtinya:\n"${item.idn}"`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        handleCopy(item);
      }
    } else {
      handleCopy(item);
    }
  };

  return (
    <div className="w-full">
      {/* Search & Filter Header (Clean Light Theme) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 mb-8 border border-gray-200 shadow-sm text-center">
        <div className="max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Kumpulan Doa Harian
          </h1>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
            Kumpulan doa-doa harian dalam Islam lengkap dengan teks Arab, transliterasi latin, dan terjemahan bahasa Indonesia sesuai sunnah.
          </p>
          <div className="inline-flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-gray-100 border border-gray-200 text-gray-800 rounded-full text-xs sm:text-sm font-semibold">
              {initialDoaList.length} Doa
            </span>
            <span className="px-3.5 py-1.5 bg-gray-100 border border-gray-200 text-gray-800 rounded-full text-xs sm:text-sm font-semibold">
              {categories.length} Kategori
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="max-w-4xl mx-auto space-y-3.5 text-left">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari doa berdasarkan nama, isi, atau kategori..."
              className="w-full pl-11 pr-10 py-3.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-sm sm:text-base transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kategori Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer pr-10 appearance-none transition-colors"
              >
                <option value="all">Semua Kategori ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>

            {/* Tag Dropdown */}
            <div className="relative">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer pr-10 appearance-none transition-colors"
              >
                <option value="all">Semua Tag ({tags.length})</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Status Counter */}
      <div className="flex items-center justify-between mb-6 px-1 text-sm text-gray-500">
        <span>
          Menampilkan <strong className="text-gray-900 font-semibold">{filteredList.length}</strong> dari{' '}
          {initialDoaList.length} doa
        </span>
        {(search || selectedCategory !== 'all' || selectedTag !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setSelectedTag('all');
            }}
            className="text-black hover:underline font-medium cursor-pointer"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Doa Cards Grid */}
      {displayedList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8">
          <p className="text-gray-500 text-lg mb-2">Tidak ditemukan doa yang sesuai.</p>
          <p className="text-gray-400 text-sm">Coba kata kunci lain atau ubah filter kategori.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedList.map((item) => (
            <div
              key={item.id}
              className="bg-white text-gray-900 rounded-2xl p-6 border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {item.nama}
                </h3>
                
                {item.grup && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-xs font-medium">
                      {item.grup}
                    </span>
                  </div>
                )}

                <p className="text-gray-600 text-xs sm:text-sm line-clamp-3 mb-4 leading-relaxed">
                  {item.tentang || item.idn}
                </p>

                {/* Tag Pills */}
                {Array.isArray(item.tag) && item.tag.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {item.tag.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-md text-xs font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoa(item)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Baca</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleShare(item, e)}
                  title="Bagikan atau Salin Doa"
                  className="p-2.5 bg-white hover:bg-gray-100 text-gray-700 hover:text-black rounded-xl transition-colors cursor-pointer border border-gray-300"
                >
                  {copiedId === item.id ? (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {displayedList.length < filteredList.length && (
        <div className="text-center mt-12">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 24)}
            className="px-8 py-3.5 bg-black hover:bg-gray-800 text-white rounded-xl font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Muat Lebih Banyak Doa ({filteredList.length - displayedList.length} lagi)
          </button>
        </div>
      )}

      {/* Modal Detail Doa (Clean Light Theme) */}
      {selectedDoa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedDoa(null)}
        >
          <div
            className="bg-white border border-gray-200 text-gray-900 w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full">
                  {selectedDoa.grup}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  {selectedDoa.nama}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoa(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* Teks Arab */}
              <div className="p-6 sm:p-8 bg-gray-50 rounded-2xl border border-gray-200">
                <p
                  dir="rtl"
                  className="text-2xl sm:text-3xl lg:text-4xl leading-loose font-arabic text-right text-gray-900 font-normal select-all"
                  style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif" }}
                >
                  {selectedDoa.ar}
                </p>
              </div>

              {/* Transliterasi Latin */}
              {selectedDoa.tr && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Transliterasi
                  </h4>
                  <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed">
                    {selectedDoa.tr}
                  </p>
                </div>
              )}

              {/* Arti Bahasa Indonesia */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Artinya
                </h4>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-sans">
                  &ldquo;{selectedDoa.idn}&rdquo;
                </p>
              </div>

              {/* Riwayat / Keterangan */}
              {selectedDoa.tentang && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Riwayat & Keterangan
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500 whitespace-pre-line leading-relaxed">
                    {selectedDoa.tentang}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopy(selectedDoa)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                {copiedId === selectedDoa.id ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Salin Doa</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedDoa(null)}
                className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
