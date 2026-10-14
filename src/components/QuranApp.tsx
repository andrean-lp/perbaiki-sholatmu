import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { equran, type RandomAyat } from '../lib/equran';

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

export interface AyatItem {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<string, string>;
}

export interface TafsirItem {
  ayat: number;
  teks: string;
}

export interface SurahNavInfo {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
}

export interface SurahDetailData {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: AudioFull;
  ayat: AyatItem[];
  suratSebelumnya: SurahNavInfo | false;
  suratSelanjutnya: SurahNavInfo | false;
}

export interface SurahTafsirData {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  tafsir: TafsirItem[];
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

  // Full Surah Audio player state
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoop, setIsLoop] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Modal Info Surat state
  const [detailSurah, setDetailSurah] = useState<SurahItem | null>(null);

  // Detail Ayat per Ayat state (GET /api/v2/surat/{nomor})
  const [activeSurahDetail, setActiveSurahDetail] = useState<SurahDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [playingAyatNumber, setPlayingAyatNumber] = useState<number | null>(null);
  const [copiedAyat, setCopiedAyat] = useState<number | null>(null);

  // Tafsir Lengkap state (GET /api/v2/tafsir/{nomor})
  const [activeTab, setActiveTab] = useState<'ayat' | 'tafsir'>('ayat');
  const [tafsirData, setTafsirData] = useState<SurahTafsirData | null>(null);
  const [isLoadingTafsir, setIsLoadingTafsir] = useState(false);
  const [tafsirError, setTafsirError] = useState<string | null>(null);
  const [expandedTafsirAyat, setExpandedTafsirAyat] = useState<Record<number, boolean>>({});
  const [copiedTafsirAyat, setCopiedTafsirAyat] = useState<number | null>(null);

  // Featured Random Ayat (Tadabbur Harian via Official SDK equran.getRandomAyat)
  const [randomAyatData, setRandomAyatData] = useState<RandomAyat | null>(null);
  const [isLoadingRandomAyat, setIsLoadingRandomAyat] = useState(false);

  const fetchRandomAyat = useCallback(async () => {
    setIsLoadingRandomAyat(true);
    try {
      const data = await equran.getRandomAyat();
      setRandomAyatData(data);
    } catch {
      // silently keep previous
    } finally {
      setIsLoadingRandomAyat(false);
    }
  }, []);

  useEffect(() => {
    fetchRandomAyat();
  }, [fetchRandomAyat]);

  // Audio Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayatAudioRef = useRef<HTMLAudioElement | null>(null);

  // Filtered surah list for main grid
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

  // Play a specific full surah
  const playSurah = (surah: SurahItem) => {
    if (ayatAudioRef.current) {
      ayatAudioRef.current.pause();
      setPlayingAyatNumber(null);
    }

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

  const playSurahRef = useRef(playSurah);
  useEffect(() => {
    playSurahRef.current = playSurah;
  });

  const playNextSurah = useCallback(() => {
    if (!currentSurah) return;
    const currentIndex = initialSuratList.findIndex((s) => s.nomor === currentSurah.nomor);
    const nextIndex = (currentIndex + 1) % initialSuratList.length;
    playSurahRef.current(initialSuratList[nextIndex]);
  }, [currentSurah, initialSuratList]);

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
    if (ayatAudioRef.current) {
      ayatAudioRef.current.playbackRate = nextSpeed;
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
    if (ayatAudioRef.current) {
      ayatAudioRef.current.volume = val;
      ayatAudioRef.current.muted = val === 0;
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

  // Full Surah Audio event listeners
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
  }, [currentSurah, isLoop, playNextSurah]);

  // Fetch Tafsir via Official SDK (GET /api/v2/tafsir/{nomor})
  const fetchTafsir = useCallback(async (nomor: number) => {
    setIsLoadingTafsir(true);
    setTafsirError(null);

    try {
      const data = await equran.getTafsir(nomor);
      setTafsirData(data as unknown as SurahTafsirData);
    } catch (err: any) {
      const msg = err?.message === 'Failed to fetch'
        ? 'Koneksi terputus atau gagal menghubungi server equran.id. Periksa koneksi internet Anda.'
        : (err?.message || 'Gagal mengambil tafsir Al-Qur\'an. Periksa koneksi internet Anda.');
      setTafsirError(msg);
    } finally {
      setIsLoadingTafsir(false);
    }
  }, []);

  // Open & Fetch Detail Ayat per Ayat via Official SDK (GET /api/v2/surat/{nomor})
  const openSurahDetail = useCallback(async (nomor: number, tab: 'ayat' | 'tafsir' = 'ayat') => {
    if (ayatAudioRef.current) {
      ayatAudioRef.current.pause();
      setPlayingAyatNumber(null);
    }

    setActiveTab(tab);
    setExpandedTafsirAyat({});

    // If opening tafsir tab directly, trigger tafsir fetch
    if (tab === 'tafsir') {
      fetchTafsir(nomor);
    } else {
      setTafsirData((prev) => (prev && prev.nomor === nomor ? prev : null));
    }

    setIsLoadingDetail(true);
    setDetailError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const data = await equran.getSurat(nomor);
      setActiveSurahDetail(data as unknown as SurahDetailData);
      const url = new URL(window.location.href);
      url.searchParams.set('surat', nomor.toString());
      if (tab === 'tafsir') url.searchParams.set('tab', 'tafsir');
      else url.searchParams.delete('tab');
      window.history.pushState({ surat: nomor, tab }, '', url);
    } catch (err: any) {
      const msg = err?.message === 'Failed to fetch'
        ? 'Koneksi terputus atau gagal menghubungi server equran.id. Periksa koneksi internet Anda.'
        : (err?.message || 'Terjadi gangguan saat mengambil data ayat. Periksa koneksi internet Anda.');
      setDetailError(msg);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [fetchTafsir]);

  const closeSurahDetail = () => {
    if (ayatAudioRef.current) {
      ayatAudioRef.current.pause();
      setPlayingAyatNumber(null);
    }
    setActiveSurahDetail(null);
    setDetailError(null);
    setActiveTab('ayat');
    setExpandedTafsirAyat({});
    const url = new URL(window.location.href);
    url.searchParams.delete('surat');
    url.searchParams.delete('tab');
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle inline tafsir accordion in verse card
  const toggleTafsirAyat = async (ayatNumber: number, surahNumber: number) => {
    setExpandedTafsirAyat((prev) => ({
      ...prev,
      [ayatNumber]: !prev[ayatNumber],
    }));

    if (!tafsirData || tafsirData.nomor !== surahNumber) {
      await fetchTafsir(surahNumber);
    }
  };

  // Play individual verse audio
  const togglePlayAyat = (ayat: AyatItem) => {
    if (!ayatAudioRef.current) {
      ayatAudioRef.current = new Audio();
    }
    const audio = ayatAudioRef.current;

    if (playingAyatNumber === ayat.nomorAyat) {
      audio.pause();
      setPlayingAyatNumber(null);
      return;
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const audioSrc = ayat.audio[selectedQari] || ayat.audio['05'];
    if (!audioSrc) return;

    audio.src = audioSrc;
    audio.playbackRate = playbackSpeed;
    audio.volume = isMuted ? 0 : volume;
    audio.load();
    audio
      .play()
      .then(() => {
        setPlayingAyatNumber(ayat.nomorAyat);
      })
      .catch(() => {
        setPlayingAyatNumber(null);
      });

    audio.onended = () => {
      setPlayingAyatNumber(null);
    };
  };

  // Robust clipboard copy with fallback for older browsers or restricted iframes
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback to execCommand if clipboard API is denied or unavailable
      }
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      const success = (document as any).execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  // Copy verse to clipboard
  const copyAyat = async (ayat: AyatItem, surahName: string) => {
    const text = `${ayat.teksArab}\n\n${ayat.teksLatin}\n"${ayat.teksIndonesia}"\n\n(QS. ${surahName}: ${ayat.nomorAyat})`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAyat(ayat.nomorAyat);
      setTimeout(() => setCopiedAyat(null), 2000);
    }
  };

  // Copy tafsir text to clipboard
  const copyTafsir = async (ayatNumber: number, surahName: string, tafsirText: string) => {
    const text = `Tafsir Kemenag RI - QS. ${surahName}: ${ayatNumber}\n\n${tafsirText}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTafsirAyat(ayatNumber);
      setTimeout(() => setCopiedTafsirAyat(null), 2000);
    }
  };

  // URL query sync & popstate
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('surat');
      const t = params.get('tab') === 'tafsir' ? 'tafsir' : 'ayat';
      if (s) {
        const num = parseInt(s, 10);
        if (!isNaN(num) && num >= 1 && num <= 114) {
          openSurahDetail(num, t);
          return;
        }
      }
      setActiveSurahDetail(null);
    };

    const params = new URLSearchParams(window.location.search);
    const s = params.get('surat');
    const t = params.get('tab') === 'tafsir' ? 'tafsir' : 'ayat';
    if (s) {
      const num = parseInt(s, 10);
      if (!isNaN(num) && num >= 1 && num <= 114) {
        openSurahDetail(num, t);
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [openSurahDetail]);

  const activeQariObj = QARI_OPTIONS.find((q) => q.id === selectedQari) || QARI_OPTIONS[0];

  return (
    <div className="w-full pb-36">
      {/* Hidden audio element for full surah */}
      <audio ref={audioRef} preload="metadata" />

      {/* ========================================================
          VIEW 1: DETAIL AYAT & TAFSIR READER
      ======================================================== */}
      {isLoadingDetail ? (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Skeleton Header */}
          <div className="animate-pulse bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8 space-y-4">
            <div className="h-6 w-32 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-48 bg-gray-100 rounded-md"></div>
          </div>
          {/* Skeleton Cards */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                  <div className="w-20 h-6 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                <div className="h-4 bg-gray-100 rounded-md w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded-md w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      ) : detailError ? (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h3 className="text-lg font-bold text-gray-900">Gagal Memuat Surat</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{detailError}</p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={closeSurahDetail}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                Kembali ke Daftar
              </button>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  const s = params.get('surat');
                  if (s) openSurahDetail(parseInt(s, 10), activeTab);
                }}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white transition cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      ) : activeSurahDetail ? (
        <div className="max-w-4xl mx-auto px-4">
          {/* Sticky Quick Nav Bar */}
          <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-sm p-3.5 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeSurahDetail}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-emerald-800 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Daftar Surat</span>
            </button>

            {/* Middle Info */}
            <div className="text-center font-bold text-sm text-gray-900">
              <span>{activeSurahDetail.namaLatin}</span>
              <span className="text-gray-400 mx-2">&bull;</span>
              <span className="font-arabic text-emerald-800 text-base">{activeSurahDetail.nama}</span>
            </div>

            {/* Qari Selector & Full Play */}
            <div className="flex items-center gap-2">
              <select
                id="ayat-qari-select"
                aria-label="Pilih Qari Audio Ayat"
                value={selectedQari}
                onChange={(e) => setSelectedQari(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium cursor-pointer"
              >
                {QARI_OPTIONS.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.short}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const surahMeta = initialSuratList.find((s) => s.nomor === activeSurahDetail.nomor);
                  if (surahMeta) playSurah(surahMeta);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentSurah?.nomor === activeSurahDetail.nomor && isPlaying
                    ? 'bg-emerald-800 text-white font-bold'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }`}
                title="Putar Murottal Seluruh Surat"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  {currentSurah?.nomor === activeSurahDetail.nomor && isPlaying ? (
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
                <span>{currentSurah?.nomor === activeSurahDetail.nomor && isPlaying ? 'Jeda Surat' : 'Putar Surat'}</span>
              </button>
            </div>
          </div>

          {/* Banner Header Surat */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-semibold mb-3">
              <span>Surat ke-{activeSurahDetail.nomor}</span>
              <span>&bull;</span>
              <span className="capitalize">{activeSurahDetail.tempatTurun}</span>
              <span>&bull;</span>
              <span>{activeSurahDetail.jumlahAyat} Ayat</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              {activeSurahDetail.namaLatin}
            </h1>
            <p className="text-base text-gray-600 mb-4 font-normal">
              Arti: <span className="font-semibold text-gray-800">&ldquo;{activeSurahDetail.arti}&rdquo;</span>
            </p>

            <div className="text-4xl sm:text-5xl font-arabic text-emerald-800 font-medium my-4">
              {activeSurahDetail.nama}
            </div>

            {/* Basmalah Banner (except Surah 9 At-Taubah and Surah 1 Al-Fatihah where Basmalah is Ayat 1) */}
            {activeSurahDetail.nomor !== 9 && activeSurahDetail.nomor !== 1 && (
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p dir="rtl" className="font-arabic text-2xl sm:text-3xl text-gray-900 mb-1 leading-loose">
                  بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                </p>
                <p className="text-xs text-gray-500 italic">
                  Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang
                </p>
              </div>
            )}
          </div>

          {/* TAB SWITCHER: AYAT & MUROTTAL VS TAFSIR LENGKAP KEMENAG */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 border border-gray-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ayat');
                  const url = new URL(window.location.href);
                  url.searchParams.delete('tab');
                  window.history.pushState({ surat: activeSurahDetail.nomor, tab: 'ayat' }, '', url);
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'ayat'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Ayat &amp; Murottal ({activeSurahDetail.jumlahAyat})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('tafsir');
                  fetchTafsir(activeSurahDetail.nomor);
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'tafsir');
                  window.history.pushState({ surat: activeSurahDetail.nomor, tab: 'tafsir' }, '', url);
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'tafsir'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Tafsir Lengkap Kemenag RI</span>
              </button>
            </div>
          </div>

          {/* ========================================================
              TAB CONTENT 1: AYAT & MUROTTAL
          ======================================================== */}
          {activeTab === 'ayat' && (
            <div className="space-y-5">
              {activeSurahDetail.ayat.map((ayat) => {
                const isAyatPlaying = playingAyatNumber === ayat.nomorAyat;
                const isJustCopied = copiedAyat === ayat.nomorAyat;
                const isTafsirOpen = Boolean(expandedTafsirAyat[ayat.nomorAyat]);
                const isTafsirForCurrentSurah = Boolean(tafsirData && tafsirData.nomor === activeSurahDetail.nomor);
                const ayatTafsirItem = isTafsirForCurrentSurah ? tafsirData?.tafsir.find((t) => t.ayat === ayat.nomorAyat) : null;

                return (
                  <article
                    key={ayat.nomorAyat}
                    id={`ayat-${ayat.nomorAyat}`}
                    className={`bg-white rounded-2xl p-5 sm:p-7 border transition-all duration-200 shadow-sm ${
                      isAyatPlaying
                        ? 'border-emerald-500 ring-2 ring-emerald-200/80 bg-emerald-50/15'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Top Bar Ayat: Nomor & Action Buttons */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100/80 mb-4">
                      {/* Circle Ayat Badge */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {ayat.nomorAyat}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          Ayat {ayat.nomorAyat}
                        </span>
                      </div>

                      {/* Action Buttons: Play Audio, Tafsir Toggle & Copy */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Play Audio Ayat */}
                        <button
                          type="button"
                          onClick={() => togglePlayAyat(ayat)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isAyatPlaying
                              ? 'bg-emerald-800 text-white font-bold shadow-xs'
                              : 'bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800'
                          }`}
                          title="Putar Murottal Ayat Ini"
                        >
                          {isAyatPlaying ? (
                            <>
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
                              <span>Dengarkan</span>
                            </>
                          )}
                        </button>

                        {/* Inline Tafsir Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleTafsirAyat(ayat.nomorAyat, activeSurahDetail.nomor)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            isTafsirOpen
                              ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                          }`}
                          title="Lihat Tafsir Kemenag untuk ayat ini"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>{isTafsirOpen ? 'Tutup Tafsir' : 'Tafsir'}</span>
                        </button>

                        {/* Copy Ayat */}
                        <button
                          type="button"
                          onClick={() => copyAyat(ayat, activeSurahDetail.namaLatin)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition cursor-pointer border border-gray-200"
                          title="Salin Ayat ke Clipboard"
                        >
                          {isJustCopied ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-emerald-700 font-semibold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Teks Arab Ayat */}
                    <p
                      dir="rtl"
                      className="font-arabic text-2xl sm:text-3xl lg:text-4xl leading-[2.2] sm:leading-[2.4] lg:leading-[2.5] text-right text-gray-900 my-4 select-text font-normal"
                    >
                      {ayat.teksArab}
                    </p>

                    {/* Teks Transliterasi Latin */}
                    <p className="text-xs sm:text-sm text-emerald-800 font-medium leading-relaxed mb-2 select-text">
                      {ayat.teksLatin}
                    </p>

                    {/* Teks Terjemahan Indonesia */}
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed select-text font-normal">
                      {ayat.teksIndonesia}
                    </p>

                    {/* Inline Accordion Tafsir Ayat */}
                    {isTafsirOpen && (
                      <div className="mt-5 pt-4 border-t border-emerald-100/80">
                        <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-100 text-gray-800">
                          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-emerald-200/60">
                            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Tafsir Kemenag RI &bull; Ayat {ayat.nomorAyat}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleTafsirAyat(ayat.nomorAyat, activeSurahDetail.nomor)}
                              className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                            >
                              &times; Tutup
                            </button>
                          </div>

                          {isLoadingTafsir || !isTafsirForCurrentSurah ? (
                            <div className="animate-pulse space-y-2 py-2">
                              <div className="h-4 bg-emerald-100/60 rounded w-full"></div>
                              <div className="h-4 bg-emerald-100/60 rounded w-4/5"></div>
                              <div className="h-4 bg-emerald-100/60 rounded w-5/6"></div>
                            </div>
                          ) : (
                            <div className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-line select-text font-normal">
                              {ayatTafsirItem?.teks || 'Tafsir untuk ayat ini sedang diproses...'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* ========================================================
              TAB CONTENT 2: TAFSIR LENGKAP KEMENAG RI
          ======================================================== */}
          {activeTab === 'tafsir' && (
            <div className="space-y-6">
              {/* Quick Jump Bar */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">Loncat ke Tafsir Ayat:</span>
                  <select
                    id="tafsir-jump-select"
                    aria-label="Loncat ke Tafsir Ayat"
                    onChange={(e) => {
                      const el = document.getElementById(`tafsir-card-${e.target.value}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium cursor-pointer"
                  >
                    {Array.from({ length: activeSurahDetail.jumlahAyat }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Ayat {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-gray-500 font-medium">
                  Sumber: <strong className="text-emerald-800 font-semibold">Tafsir Kemenag RI (via EQuran.id)</strong>
                </div>
              </div>

              {isLoadingTafsir ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                      <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                      <div className="h-4 bg-gray-100 rounded w-4/5"></div>
                      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : tafsirError ? (
                <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm text-center space-y-3">
                  <p className="text-sm text-rose-600">{tafsirError}</p>
                  <button
                    type="button"
                    onClick={() => fetchTafsir(activeSurahDetail.nomor)}
                    className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Muat Ulang Tafsir
                  </button>
                </div>
              ) : (tafsirData && tafsirData.nomor === activeSurahDetail.nomor) ? (
                <div className="space-y-6">
                  {tafsirData.tafsir.map((tItem) => {
                    const matchedAyat = activeSurahDetail.ayat.find((a) => a.nomorAyat === tItem.ayat);
                    const isJustCopied = copiedTafsirAyat === tItem.ayat;

                    return (
                      <article
                        key={tItem.ayat}
                        id={`tafsir-card-${tItem.ayat}`}
                        className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:border-gray-200 transition-all text-left"
                      >
                        {/* Header Tafsir Ayat */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {tItem.ayat}
                            </div>
                            <h3 className="font-bold text-gray-900 text-base">
                              Tafsir Ayat ke-{tItem.ayat}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyTafsir(tItem.ayat, activeSurahDetail.namaLatin, tItem.teks)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition cursor-pointer border border-gray-200"
                            title="Salin teks tafsir ayat ini"
                          >
                            {isJustCopied ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-emerald-700 font-semibold">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                <span>Salin Tafsir</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Rujukan Ayat Singkat */}
                        {matchedAyat && (
                          <div className="bg-gray-50/80 rounded-xl p-4 mb-4 border border-gray-100">
                            <p dir="rtl" className="font-arabic text-xl sm:text-2xl text-right text-gray-900 mb-2 leading-loose">
                              {matchedAyat.teksArab}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 italic">
                              &ldquo;{matchedAyat.teksIndonesia}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Isi Teks Tafsir Kemenag */}
                        <div className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-line select-text font-normal">
                          {tItem.teks}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* Bottom Navigation: Prev & Next Surah */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            {activeSurahDetail.suratSebelumnya ? (
              <button
                type="button"
                onClick={() => openSurahDetail((activeSurahDetail.suratSebelumnya as SurahNavInfo).nomor, activeTab)}
                className="w-full sm:w-auto inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-gray-800 hover:text-emerald-900 border border-gray-200 shadow-sm text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Surat Sebelumnya: {(activeSurahDetail.suratSebelumnya as SurahNavInfo).namaLatin}</span>
              </button>
            ) : (
              <div></div>
            )}

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-xs font-semibold text-gray-500 hover:text-emerald-800 transition cursor-pointer"
            >
              &uarr; Kembali ke Atas
            </button>

            {activeSurahDetail.suratSelanjutnya ? (
              <button
                type="button"
                onClick={() => openSurahDetail((activeSurahDetail.suratSelanjutnya as SurahNavInfo).nomor, activeTab)}
                className="w-full sm:w-auto inline-flex items-center justify-end gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-gray-800 hover:text-emerald-900 border border-gray-200 shadow-sm text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <span>Surat Selanjutnya: {(activeSurahDetail.suratSelanjutnya as SurahNavInfo).namaLatin}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================
            VIEW 2: GRID 114 SURAH
        ======================================================== */
        <>
          {/* Header Section (Light Theme) */}
          <div className="text-center max-w-4xl mx-auto px-4 mb-8">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
              Jelajahi <span className="text-emerald-700">114 Surat</span> Al-Quran
            </h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Baca ayat per ayat, tadabbur tafsir resmi Kemenag RI, dan dengarkan murottal dari 6 qari internasional
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
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
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

            {/* Featured: Ayat Inspirasi Hari Ini (Official SDK equran.getRandomAyat) */}
            {randomAyatData && (
              <div className="mt-8 max-w-4xl mx-auto text-left">
                <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 sm:p-7 relative overflow-hidden transition-all hover:border-emerald-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      Ayat Inspirasi Hari Ini
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchRandomAyat}
                        disabled={isLoadingRandomAyat}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                        title="Dapatkan ayat acak lainnya"
                      >
                        <svg className={`w-3.5 h-3.5 ${isLoadingRandomAyat ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{isLoadingRandomAyat ? 'Memuat...' : 'Acak Ayat Lain'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p dir="rtl" className="font-arabic text-2xl sm:text-3xl text-right text-gray-900 leading-loose mb-3 font-normal">
                      {randomAyatData.ayat.teksArab}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-800 font-medium mb-1.5">
                      {randomAyatData.ayat.teksLatin}
                    </p>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed italic">
                      &ldquo;{randomAyatData.ayat.teksIndonesia}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">
                      QS. {randomAyatData.suratNamaLatin} : Ayat {randomAyatData.ayat.nomorAyat}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlayAyat(randomAyatData.ayat as unknown as AyatItem)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          playingAyatNumber === randomAyatData.ayat.nomorAyat
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {playingAyatNumber === randomAyatData.ayat.nomorAyat ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                            <span>Jeda Murottal</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>Dengarkan Ayat</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openSurahDetail(randomAyatData.suratNomor, 'ayat')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        <span>Buka Surat {randomAyatData.suratNamaLatin}</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  Qari Murottal:
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

          {/* Surah Cards Grid */}
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
                        <div
                          className="flex items-center gap-3.5 min-w-0 cursor-pointer flex-1"
                          onClick={() => openSurahDetail(surah.nomor, 'ayat')}
                        >
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
                                {surah.jumlahAyat} Ayat
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Arabic Calligraphy Name in Emerald */}
                        <div
                          className="text-right shrink-0 cursor-pointer"
                          onClick={() => openSurahDetail(surah.nomor, 'ayat')}
                        >
                          <div className="text-2xl sm:text-3xl font-arabic text-emerald-800 font-medium group-hover:text-emerald-950 transition-colors">
                            {surah.nama}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5 flex-wrap">
                        {/* Baca Ayat Button */}
                        <button
                          type="button"
                          onClick={() => openSurahDetail(surah.nomor, 'ayat')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs"
                          title={`Baca ${surah.jumlahAyat} ayat surat ${surah.namaLatin}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>Baca Ayat</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Tafsir Button */}
                          <button
                            type="button"
                            onClick={() => openSurahDetail(surah.nomor, 'tafsir')}
                            className="text-xs text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 py-1.5 px-2 rounded-lg transition cursor-pointer font-semibold"
                            title="Baca tafsir lengkap Kemenag RI"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Tafsir</span>
                          </button>

                          {/* Info Modal Button */}
                          <button
                            type="button"
                            onClick={() => setDetailSurah(surah)}
                            className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-gray-100 transition cursor-pointer font-medium"
                            title="Lihat info & sejarah surat"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="hidden sm:inline">Info</span>
                          </button>

                          {/* Play Murottal Full Surah */}
                          <button
                            type="button"
                            onClick={() => playSurah(surah)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isThisPlaying
                                ? 'bg-emerald-800 text-white font-bold shadow-xs'
                                : 'bg-gray-100 text-gray-800 hover:bg-emerald-50 hover:text-emerald-800 border border-transparent'
                            }`}
                          >
                            {isThisPlaying ? (
                              <>
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
                                <span>Audio</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          PERSISTENT BOTTOM AUDIO PLAYER BAR (Light Theme)
      ======================================================== */}
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

              {/* Middle Column: Player Controls */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-1/3">
                {/* Loop Button */}
                <button
                  type="button"
                  onClick={() => setIsLoop(!isLoop)}
                  className={`p-2 rounded-lg transition cursor-pointer ${
                    isLoop ? 'text-emerald-700 bg-emerald-50' : 'text-gray-400 hover:text-black hover:bg-gray-100'
                  }`}
                  title={isLoop ? 'Ulangi Surat: Aktif' : 'Ulangi Surat: Nonaktif'}
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

      {/* ========================================================
          INFO & SEJARAH SURAT MODAL (Light Theme)
      ======================================================== */}
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
                Kandungan &amp; Sejarah Surat
              </h4>
              <div
                className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900"
                dangerouslySetInnerHTML={{ __html: detailSurah.deskripsi }}
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const num = detailSurah.nomor;
                    setDetailSurah(null);
                    openSurahDetail(num, 'ayat');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Baca Ayat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const num = detailSurah.nomor;
                    setDetailSurah(null);
                    openSurahDetail(num, 'tafsir');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Buka Tafsir</span>
                </button>
              </div>

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
