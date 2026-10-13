import React, { useState, useRef, useEffect } from 'react';

export interface VectorItem {
  tipe: 'ayat' | 'tafsir' | 'doa' | string;
  skor: number;
  relevansi: string;
  data: {
    // Ayat fields
    id_surat?: number;
    nama_surat?: string;
    nama_surat_arab?: string;
    nomor_ayat?: number;
    teks_arab?: string;
    teks_latin?: string;
    terjemahan_id?: string;
    // Tafsir fields
    isi?: string;
    // Doa fields
    id_doa?: number;
    judul?: string;
    grup?: string;
    terjemahan?: string;
    catatan?: string;
  };
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  results?: VectorItem[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Ayat tentang sabar',
  'Doa saat hati gelisah',
  'Keutamaan sholat tepat waktu',
  'Hukum bersikap sombong',
];

export default function QuranChatWidget({ initialOpen = false }: { initialOpen?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  // Handle submit query
  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('https://equran.id/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cari: q, batas: 3 }),
      });

      if (!res.ok) {
        throw new Error('Gagal menghubungi server');
      }

      const data = await res.json();
      const results: VectorItem[] = Array.isArray(data.hasil) ? data.hasil : [];

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        results: results,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Maaf, terjadi gangguan saat mencari dalil. Silakan coba tanyakan kembali beberapa saat lagi.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset chat
  const handleReset = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Helper Pill Prompt on Desktop when closed */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-white text-gray-800 text-xs font-semibold py-2 px-3.5 rounded-full border border-gray-200 shadow-lg hover:border-black transition-all cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tanya Al-Quran</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Tutup Tanya Al-Quran' : 'Buka Tanya Al-Quran'}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer relative"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
          {!isOpen && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </button>
      </div>

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[550px] max-h-[82vh] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm leading-tight">
                  Tanya Al-Quran & Tafsir
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-500">Sesuai Al-Quran & Sunnah Shahih</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition text-xs"
                  title="Hapus riwayat percakapan"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                aria-label="Tutup jendela chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60">
            {/* Welcome Bubble */}
            <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 border border-gray-200/80 shadow-xs space-y-2">
              <p className="text-xs text-gray-700 leading-relaxed">
                <strong>Assalamu&apos;alaikum!</strong> Tanyakan pertanyaanmu dengan bahasa sehari-hari. Sistem akan mencarikan ayat Al-Quran, doa, dan tafsir Kemenag yang paling sesuai.
              </p>
              {messages.length === 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Contoh pertanyaan:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition text-left cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                {msg.sender === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-black text-white rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-[85%] text-xs shadow-xs leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs p-3.5 max-w-[96%] text-xs shadow-xs space-y-3">
                      {msg.text && (
                        <p className="text-gray-700 leading-relaxed">{msg.text}</p>
                      )}

                      {msg.results && msg.results.length === 0 && (
                        <p className="text-gray-500 italic">
                          Belum ditemukan ayat atau tafsir yang sesuai dengan kata kunci tersebut. Coba gunakan pertanyaan atau topik lain.
                        </p>
                      )}

                      {msg.results && msg.results.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Rujukan Ditemukan ({msg.results.length}):
                          </p>
                          {msg.results.map((item, idx) => {
                            const d = item.data;
                            const isAyat = item.tipe === 'ayat';
                            const isDoa = item.tipe === 'doa';
                            const isTafsir = item.tipe === 'tafsir';

                            return (
                              <div
                                key={idx}
                                className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2"
                              >
                                {/* Badge & Source Header */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-gray-900">
                                    {isDoa
                                      ? d.judul || 'Doa Harian'
                                      : `Surah ${d.nama_surat || ''} [${d.id_surat || ''}:${d.nomor_ayat || ''}]`}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 capitalize">
                                    {isAyat ? 'Ayat Al-Quran' : isTafsir ? 'Tafsir Kemenag' : 'Doa'}
                                  </span>
                                </div>

                                {/* Arabic Text if available */}
                                {d.teks_arab && (
                                  <div className="text-right font-serif text-base text-gray-900 leading-loose py-1">
                                    {d.teks_arab}
                                  </div>
                                )}

                                {/* Latin Transliteration */}
                                {d.teks_latin && (
                                  <p className="text-xs text-gray-500 italic">
                                    {d.teks_latin}
                                  </p>
                                )}

                                {/* Indonesian Translation / Content */}
                                {(d.terjemahan_id || d.terjemahan || d.isi) && (
                                  <p className="text-xs text-gray-700 leading-relaxed">
                                    &ldquo;{d.terjemahan_id || d.terjemahan || d.isi}&rdquo;
                                  </p>
                                )}

                                {/* Hadith Notes if Doa */}
                                {d.catatan && (
                                  <div className="text-xs text-gray-500 border-t border-gray-200/60 pt-1 line-clamp-2">
                                    {d.catatan}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs p-3 shadow-xs flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs text-gray-500">Mencari dalil & tafsir...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya ayat, tafsir, sholat, atau doa..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black placeholder-gray-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8.5 h-8.5 rounded-xl bg-black text-white hover:bg-gray-800 flex items-center justify-center transition disabled:opacity-30 cursor-pointer shrink-0"
              title="Kirim pertanyaan"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
