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

interface AudioPlayerAppProps {
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

export default function AudioPlayerApp({ initialSuratList }: AudioPlayerAppProps) {
  const [selectedQari, setSelectedQari] = useState('05');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'juz30' | 'makkiyah' | 'madaniyah'>('all');
  
  // Audio state
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoop, setIsLoop] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Modal detail surah
  const [detailSurah, setDetailSurah] = useState<SurahItem | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filtered surah list
  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialSuratList.filter((item) => {
      // Type / Juz filter
      if (filterType === 'juz30' && item.nomor < 78) return false;
      if (filterType === 'makkiyah' && item.tempatTurun.toLowerCase() !== 'mekah') return false;
      if (filterType === 'madaniyah' && item.tempatTurun.toLowerCase() !== 'madinah') return false;

      // Search query
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

  // Handle play specific surah
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

    // Switch surah
    setCurrentSurah(surah);
    setIsLoadingAudio(true);
    setCurrentTime(0);

    const audioUrl = surah.audioFull[selectedQari] || surah.audioFull['05'];
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        })
        .catch(() => {
          setIsLoadingAudio(false);
        });
    }
  };

  // Change Qari on the fly
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

  // Play / Pause toggle in bottom bar
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

  // Next surah
  const playNextSurah = () => {
    if (!currentSurah) return;
    const currentIndex = initialSuratList.findIndex((s) => s.nomor === currentSurah.nomor);
    const nextIndex = (currentIndex + 1) % initialSuratList.length;
    playSurah(initialSuratList[nextIndex]);
  };

  // Previous surah
  const playPrevSurah = () => {
    if (!currentSurah) return;
    const currentIndex = initialSuratList.findIndex((s) => s.nomor === currentSurah.nomor);
    const prevIndex = (currentIndex - 1 + initialSuratList.length) % initialSuratList.length;
    playSurah(initialSuratList[prevIndex]);
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Cycle speed
  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  // Audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoadingAudio(false);
    };
    const onWaiting = () => setIsLoadingAudio(true);
    const onPlaying = () => {
      setIsLoadingAudio(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
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

  const activeQariObj = QARI_OPTIONS.find((q) => q.id === selectedQari) || QARI_OPTIONS[0];

  return (
    <div className="w-full pb-36">
      {/* Hidden HTML Audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 mb-4 border border-gray-200">
          <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          Murottal Al-Quran Digital
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Audio Player Al-Quran
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Dengarkan lantunan merdu ayat-ayat suci Al-Quran 30 juz lengkap dengan kualitas audio jernih dari para qari internasional ternama.
        </p>
      </div>

      {/* Controls & Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="md:col-span-7 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari surah (contoh: Al-Fatihah, 1, Yasin)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Qari Selector */}
          <div className="md:col-span-5">
            <div className="relative">
              <label htmlFor="qari-select" className="sr-only">Pilih Qari</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <select
                id="qari-select"
                value={selectedQari}
                onChange={(e) => handleQariChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black cursor-pointer text-gray-800 font-medium"
              >
                {QARI_OPTIONS.map((q) => (
                  <option key={q.id} value={q.id}>
                    Qari: {q.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Row: Category Pills & Counter */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-1 hidden sm:inline">Kategori:</span>
            {[
              { id: 'all', label: 'Semua Surah' },
              { id: 'juz30', label: 'Juz 30 (Pendek)' },
              { id: 'makkiyah', label: 'Makkiyah' },
              { id: 'madaniyah', label: 'Madaniyah' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Counter & Status */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500">
            <span>
              Menampilkan <strong className="text-gray-900">{filteredList.length}</strong> dari {initialSuratList.length} surah
            </span>
            <span className="hidden md:inline text-gray-300">|</span>
            <span className="hidden md:inline">
              Qari: <strong className="text-gray-800">{activeQariObj.short}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Surah List Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">Tidak ada surah yang cocok dengan pencarian kata kunci ini.</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterType('all'); }}
            className="mt-4 inline-flex items-center px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((surah) => {
            const isThisPlaying = currentSurah?.nomor === surah.nomor && isPlaying;
            const isThisSelected = currentSurah?.nomor === surah.nomor;

            return (
              <div
                key={surah.nomor}
                className={`relative group bg-white rounded-2xl border transition-all p-4.5 flex flex-col justify-between ${
                  isThisSelected
                    ? 'border-black ring-1 ring-black shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Surah Number Badge */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                          isThisSelected
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
                        }`}
                      >
                        {surah.nomor}
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-base leading-snug">
                          {surah.namaLatin}
                        </h2>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {surah.arti}
                        </p>
                      </div>
                    </div>

                    {/* Arabic Name */}
                    <div className="text-right">
                      <div className="text-xl font-serif text-gray-900 font-medium">
                        {surah.nama}
                      </div>
                      <span className="text-[11px] text-gray-400 capitalize">
                        {surah.tempatTurun} - {surah.jumlahAyat} Ayat
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions of Card */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  {/* Info Button */}
                  <button
                    type="button"
                    onClick={() => setDetailSurah(surah)}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black py-1 px-2 rounded-lg hover:bg-gray-100 transition"
                    title="Lihat info & asbabun nuzul surah"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Detail</span>
                  </button>

                  {/* Play Button on Card */}
                  <button
                    type="button"
                    onClick={() => playSurah(surah)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      isThisPlaying
                        ? 'bg-black text-white hover:bg-gray-800 ring-2 ring-black/20'
                        : isThisSelected
                        ? 'bg-gray-900 text-white hover:bg-black'
                        : 'bg-gray-100 text-gray-800 hover:bg-black hover:text-white'
                    }`}
                  >
                    {isThisPlaying ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <span>Jeda</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Putar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Persistent Bottom Audio Player Bar */}
      {currentSurah && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl transition-all">
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
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
                />
              </div>
              <span className="w-10">{formatTime(duration)}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* Left Column: Now Playing Info */}
              <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-sm">
                  {currentSurah.nomor}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {currentSurah.namaLatin}
                    </h3>
                    <span className="font-serif text-sm text-gray-700 hidden sm:inline">
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
                  className={`p-2 rounded-lg transition-colors ${
                    isLoop ? 'text-black bg-gray-100 font-bold' : 'text-gray-400 hover:text-gray-700'
                  }`}
                  title={isLoop ? 'Ulang surah ini aktif' : 'Lanjut ke surah berikutnya'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* Prev Surah */}
                <button
                  type="button"
                  onClick={playPrevSurah}
                  className="p-2 text-gray-700 hover:text-black rounded-lg hover:bg-gray-100 transition"
                  title="Surah Sebelumnya"
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
                  className="w-11 h-11 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center transition shadow-md active:scale-95"
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
                  className="p-2 text-gray-700 hover:text-black rounded-lg hover:bg-gray-100 transition"
                  title="Surah Selanjutnya"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>

                {/* Speed Button */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                  title="Kecepatan Pemutaran"
                >
                  {playbackSpeed}x
                </button>
              </div>

              {/* Right Column: Volume & Download */}
              <div className="hidden sm:flex items-center justify-end gap-3 w-1/3">
                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition"
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
                    className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Direct Download Link */}
                <a
                  href={currentSurah.audioFull[selectedQari] || currentSurah.audioFull['05']}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-2 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition"
                  title="Unduh MP3 Surah Ini"
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

      {/* Detail / Asbabun Nuzul Modal */}
      {detailSurah && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setDetailSurah(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto border border-gray-200 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md">
                  Surah ke-{detailSurah.nomor} - {detailSurah.tempatTurun}
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">
                  {detailSurah.namaLatin}{' '}
                  <span className="font-serif text-gray-600 font-normal">
                    ({detailSurah.nama})
                  </span>
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Artinya: &ldquo;{detailSurah.arti}&rdquo; - {detailSurah.jumlahAyat} Ayat
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailSurah(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content / Deskripsi */}
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <h4 className="font-semibold text-gray-900">Tentang & Keutamaan Surah:</h4>
              <div
                className="prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: detailSurah.deskripsi }}
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  playSurah(detailSurah);
                  setDetailSurah(null);
                }}
                className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Putar Surah Ini
              </button>
              <button
                type="button"
                onClick={() => setDetailSurah(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition"
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
