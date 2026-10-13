import React, { useState, useMemo, useRef, useEffect } from 'react';

export interface AudioFull {
  '01': string;
  '02': string;
  '03': string;
  '04': string;
  '05': string;
  '06': string;
  [key: string]: string;
}

export interface SurahItem {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: AudioFull;
}

interface QuranAppProps {
  initialSuratList: SurahItem[];
}

export const QARI_OPTIONS = [
  { id: '05', name: 'Misyari Rasyid Al-Afasi', short: 'Al-Afasi' },
  { id: '03', name: 'Abdurrahman as-Sudais', short: 'As-Sudais' },
  { id: '01', name: 'Abdullah Al-Juhany', short: 'Al-Juhany' },
  { id: '02', name: 'Abdul-Muhsin Al-Qasim', short: 'Al-Qasim' },
  { id: '04', name: 'Ibrahim Al-Dossari', short: 'Al-Dossari' },
  { id: '06', name: 'Yasser Al-Dosari', short: 'Al-Dosari' },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function QuranApp({ initialSuratList }: QuranAppProps) {
  const [selectedQari, setSelectedQari] = useState('05');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'juz30' | 'makkiyah' | 'madaniyah'>('all');

  // Audio player state
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoop, setIsLoop] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Modal detail
  const [detailSurah, setDetailSurah] = useState<SurahItem | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filtered surah list
  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialSuratList.filter((item) => {
      if (filterType === 'juz30' && item.nomor < 78) return false;
      if (filterType === 'makkiyah' && item.tempatTurun.toLowerCase() !== 'mekah') return false;
      if (filterType === 'madaniyah' && item.tempatTurun.toLowerCase() !== 'madinah') return false;

      if (q) {
        const inNomor = item.nomor.toString() === q;
        const inLatin = item.namaLatin.toLowerCase().includes(q);
        const inArab = item.nama.includes(q);
        const inArti = item.arti.toLowerCase().includes(q);
        return inNomor || inLatin || inArab || inArti;
      }
      return true;
    });
  }, [initialSuratList, search, filterType]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoadingAudio(false);
    };
    const onWaiting = () => setIsLoadingAudio(true);
    const onPlaying = () => {
      setIsLoadingAudio(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (isLoop) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextSurah();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentSurah, isLoop, selectedQari]);

  // Play a specific surah
  const playSurah = (surah: SurahItem) => {
    if (currentSurah?.nomor === surah.nomor) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    setCurrentSurah(surah);
    setIsLoadingAudio(true);
    setCurrentTime(0);

    const audioUrl = surah.audioFull[selectedQari] || surah.audioFull['05'];
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        })
        .catch(() => {
          setIsLoadingAudio(false);
        });
    }
  };

  const handleQariChange = (qariId: string) => {
    setSelectedQari(qariId);
    if (currentSurah && audioRef.current) {
      const wasPlaying = isPlaying;
      const currentPos = audioRef.current.currentTime;
      const newUrl = currentSurah.audioFull[qariId] || currentSurah.audioFull['05'];

      audioRef.current.src = newUrl;
      audioRef.current.load();
      audioRef.current.currentTime = currentPos;
      if (wasPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const togglePlayPause = () => {
    if (!currentSurah) {
      if (filteredList.length > 0) {
        playSurah(filteredList[0]);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const playNextSurah = () => {
    if (!currentSurah) return;
    const currentIndex = initialSuratList.findIndex((s) => s.nomor === currentSurah.nomor);
    const nextIndex = (currentIndex + 1) % initialSuratList.length;
    playSurah(initialSuratList[nextIndex]);
  };

  const playPrevSurah = () => {
    if (!currentSurah) return;
    const currentIndex = initialSuratList.findIndex((s) => s.nomor === currentSurah.nomor);
    const prevIndex = (currentIndex - 1 + initialSuratList.length) % initialSuratList.length;
    playSurah(initialSuratList[prevIndex]);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      } else {
        audioRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  const activeQariObj = QARI_OPTIONS.find((q) => q.id === selectedQari) || QARI_OPTIONS[0];

  return (
    <div className="w-full pb-36">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Header Section (Light Theme) */}
      <div className="text-center max-w-4xl mx-auto px-4 mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
          Jelajahi <span className="text-emerald-700">114 Surat</span> Al-Quran
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Cari berdasarkan nama surat, nomor, atau arti dalam bahasa Indonesia
        </p>

        {/* Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="input-cari-surat"
              name="input-cari-surat"
              aria-label="Cari nama surat, nomor, atau arti"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama surat, nomor, atau arti..."
              className="w-full pl-12 pr-10 py-3.5 bg-white text-gray-900 placeholder-gray-400 text-sm sm:text-base rounded-2xl border border-gray-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                aria-label="Hapus kata kunci pencarian surat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Contoh: &ldquo;Al-Fatihah&rdquo;, &ldquo;1&rdquo;, atau &ldquo;Pembukaan&rdquo;
          </p>
        </div>

        {/* Status Counters (Pills) */}
        <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium flex-wrap">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>114 Surat</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-800 border border-sky-200 px-3.5 py-1.5 rounded-full font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>6.236 Ayat</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-full font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>30 Juz</span>
          </div>
        </div>
      </div>

      {/* Filter and Qari Selector Controls */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: 'Semua Surat' },
              { id: 'juz30', label: 'Juz 30 (Surat Pendek)' },
              { id: 'makkiyah', label: 'Makkiyah' },
              { id: 'madaniyah', label: 'Madaniyah' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Qari Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="quran-qari-select" className="text-xs text-gray-600 font-semibold whitespace-nowrap">
              Qari:
            </label>
            <select
              id="quran-qari-select"
              name="quran-qari-select"
              aria-label="Pilih Qari Murottal"
              value={selectedQari}
              onChange={(e) => handleQariChange(e.target.value)}
              className="bg-gray-50 text-gray-900 border border-gray-200 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer font-medium"
            >
              {QARI_OPTIONS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Surah Cards Grid (Light Theme) */}
      <div className="max-w-7xl mx-auto px-4">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs">
            <p>Tidak ada surat yang sesuai dengan pencarian &ldquo;{search}&rdquo;.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterType('all'); }}
              className="mt-4 px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition cursor-pointer"
            >
              Tampilkan Semua Surat
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredList.map((surah) => {
              const isThisPlaying = currentSurah?.nomor === surah.nomor && isPlaying;
              const isThisSelected = currentSurah?.nomor === surah.nomor;

              return (
                <div
                  key={surah.nomor}
                  className={`group relative rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between ${
                    isThisSelected
                      ? 'bg-emerald-50/60 border-2 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white hover:bg-gray-50/80 border border-gray-200 hover:border-emerald-300 hover:shadow-md shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Circle Number Badge */}
                      <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-amber-100 transition-colors">
                        {surah.nomor}
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 text-base leading-snug truncate group-hover:text-emerald-800 transition-colors">
                          {surah.namaLatin}
                        </h2>
                        <p className="text-xs text-gray-500 truncate mb-2">
                          {surah.arti}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Location Badge */}
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {surah.tempatTurun}
                          </span>

                          {/* Ayat Count Badge */}
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {surah.jumlahAyat}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arabic Calligraphy Name in Emerald */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl sm:text-3xl font-serif text-emerald-800 font-medium group-hover:text-emerald-950 transition-colors">
                        {surah.nama}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDetailSurah(surah)}
                      className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-gray-100 transition cursor-pointer font-medium"
                      title="Lihat info & tafsir surah"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Tafsir & Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playSurah(surah)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isThisPlaying
                          ? 'bg-emerald-800 text-white font-bold shadow-xs'
                          : 'bg-gray-100 text-gray-800 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-transparent'
                      }`}
                    >
                      {isThisPlaying ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>Jeda Audio</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>Putar Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Bottom Audio Player Bar (Light Theme) */}
      {currentSurah && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl transition-all text-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-3 sm:py-3.5">
            {/* Scrubber slider bar */}
            <div className="w-full flex items-center gap-3 mb-2 text-xs font-medium text-gray-500">
              <span className="w-10 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-700 focus:outline-none"
                />
              </div>
              <span className="w-10">{formatTime(duration)}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* Left Column: Now Playing Info */}
              <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-xs">
                  {currentSurah.nomor}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {currentSurah.namaLatin}
                    </h3>
                    <span className="font-serif text-sm text-emerald-800 hidden sm:inline">
                      ({currentSurah.nama})
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    Qari: {activeQariObj.name}
                  </p>
                </div>
              </div>

              {/* Center Column: Player Controls */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 w-full sm:w-1/3">
                {/* Loop Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLoop(!isLoop)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isLoop ? 'text-emerald-800 bg-emerald-50 font-bold' : 'text-gray-400 hover:text-gray-700'
                  }`}
                  title={isLoop ? 'Ulang surah aktif' : 'Lanjut ke surah berikutnya'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* Prev Surah */}
                <button
                  type="button"
                  onClick={playPrevSurah}
                  className="p-2 text-gray-700 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title="Surat Sebelumnya"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Play / Pause Main Button */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  disabled={isLoadingAudio}
                  className="w-11 h-11 rounded-full bg-emerald-800 text-white hover:bg-emerald-700 flex items-center justify-center transition shadow-md active:scale-95 cursor-pointer font-bold"
                  title={isPlaying ? 'Jeda' : 'Putar'}
                >
                  {isLoadingAudio ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Next Surah */}
                <button
                  type="button"
                  onClick={playNextSurah}
                  className="p-2 text-gray-700 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title="Surat Selanjutnya"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>

                {/* Speed Button */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition cursor-pointer"
                  title="Kecepatan Pemutaran"
                >
                  {playbackSpeed}x
                </button>
              </div>

              {/* Right Column: Volume & Download */}
              <div className="hidden sm:flex items-center justify-end gap-3 w-1/3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                  />
                </div>

                <a
                  href={currentSurah.audioFull[selectedQari] || currentSurah.audioFull['05']}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-2 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition"
                  title="Unduh MP3 Surat Ini"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Asbabun Nuzul Modal (Light Theme) */}
      {detailSurah && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setDetailSurah(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto border border-gray-200 shadow-2xl relative text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Surat ke-{detailSurah.nomor}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {detailSurah.tempatTurun} &bull; {detailSurah.jumlahAyat} Ayat
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {detailSurah.namaLatin} &bull; <span className="font-normal text-gray-600">{detailSurah.arti}</span>
                </h2>
              </div>
              <div className="text-2xl font-serif text-emerald-800 font-medium">
                {detailSurah.nama}
              </div>
            </div>

            {/* Modal Body: Tafsir / Deskripsi */}
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                Kandungan & Sejarah Surat
              </h4>
              <div
                className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900"
                dangerouslySetInnerHTML={{ __html: detailSurah.deskripsi }}
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => playSurah(detailSurah)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Putar Murottal Surat Ini</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailSurah(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
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
