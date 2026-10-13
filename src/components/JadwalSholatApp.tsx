import React, { useState, useEffect, useMemo } from "react";

export interface JadwalDay {
  tanggal: number;
  tanggal_lengkap: string;
  hari: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface ShalatScheduleData {
  provinsi: string;
  kabkota: string;
  bulan: number;
  tahun: number;
  bulan_nama: string;
  jadwal: JadwalDay[];
}

interface JadwalSholatAppProps {
  initialProvinces: string[];
  initialCities: string[];
  initialSchedule: ShalatScheduleData | null;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const PRAYER_KEYS: Array<{ key: keyof JadwalDay; label: string; isFardhu: boolean }> = [
  { key: "imsak", label: "Imsak", isFardhu: false },
  { key: "subuh", label: "Subuh", isFardhu: true },
  { key: "terbit", label: "Terbit", isFardhu: false },
  { key: "dhuha", label: "Dhuha", isFardhu: false },
  { key: "dzuhur", label: "Dzuhur", isFardhu: true },
  { key: "ashar", label: "Ashar", isFardhu: true },
  { key: "maghrib", label: "Maghrib", isFardhu: true },
  { key: "isya", label: "Isya", isFardhu: true },
];

function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.split(":");
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return isNaN(h) || isNaN(m) ? -1 : h * 60 + m;
}

export default function JadwalSholatApp({
  initialProvinces,
  initialCities,
  initialSchedule,
}: JadwalSholatAppProps) {
  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentYearNum = currentDate.getFullYear();
  const currentDayNum = currentDate.getDate();

  const [provinces] = useState<string[]>(initialProvinces || []);
  const [selectedProvince, setSelectedProvince] = useState<string>(
    initialSchedule?.provinsi || "DKI Jakarta"
  );
  const [cities, setCities] = useState<string[]>(initialCities || []);
  const [selectedCity, setSelectedCity] = useState<string>(
    initialSchedule?.kabkota || "Kota Jakarta"
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear] = useState<number>(currentYearNum);

  const [scheduleData, setScheduleData] = useState<ShalatScheduleData | null>(
    initialSchedule
  );
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Digital clock
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Restore saved location from localStorage on client mount
  useEffect(() => {
    try {
      const savedProv = localStorage.getItem("perbaiki_sholat_provinsi");
      const savedCity = localStorage.getItem("perbaiki_sholat_kabkota");

      if (savedProv && savedCity) {
        if (
          savedProv !== selectedProvince ||
          savedCity !== selectedCity ||
          !scheduleData
        ) {
          setSelectedProvince(savedProv);
          fetchCitiesAndSchedule(savedProv, savedCity, selectedMonth, selectedYear);
        }
      }
    } catch (_) {}
  }, []);

  // Fetch cities for a province and optionally fetch schedule
  async function fetchCitiesAndSchedule(
    prov: string,
    cityToSelect?: string,
    month = selectedMonth,
    year = selectedYear
  ) {
    setIsLoadingCities(true);
    setErrorMessage(null);
    try {
      const res = await fetch("https://equran.id/api/v2/shalat/kabkota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provinsi: prov }),
      });
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        setCities(json.data);
        const targetCity =
          cityToSelect && json.data.includes(cityToSelect)
            ? cityToSelect
            : json.data[0];
        setSelectedCity(targetCity);
        await fetchSchedule(prov, targetCity, month, year);
      } else {
        setCities([]);
      }
    } catch (err) {
      setErrorMessage("Gagal memuat daftar kabupaten/kota. Periksa koneksi internet Anda.");
    } finally {
      setIsLoadingCities(false);
    }
  }

  // Fetch prayer schedule
  async function fetchSchedule(
    prov: string,
    city: string,
    month: number,
    year: number
  ) {
    setIsLoadingSchedule(true);
    setErrorMessage(null);
    try {
      const res = await fetch("https://equran.id/api/v2/shalat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provinsi: prov,
          kabkota: city,
          bulan: month,
          tahun: year,
        }),
      });
      const json = await res.json();
      if (json.data && json.data.jadwal) {
        setScheduleData(json.data);
        try {
          localStorage.setItem("perbaiki_sholat_provinsi", prov);
          localStorage.setItem("perbaiki_sholat_kabkota", city);
        } catch (_) {}
      } else {
        setErrorMessage("Data jadwal shalat tidak ditemukan untuk lokasi ini.");
      }
    } catch (err) {
      setErrorMessage("Gagal memuat jadwal shalat. Silakan coba beberapa saat lagi.");
    } finally {
      setIsLoadingSchedule(false);
    }
  }

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    setSelectedProvince(newProv);
    fetchCitiesAndSchedule(newProv, undefined, selectedMonth, selectedYear);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setSelectedCity(newCity);
    fetchSchedule(selectedProvince, newCity, selectedMonth, selectedYear);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setSelectedMonth(newMonth);
    fetchSchedule(selectedProvince, selectedCity, newMonth, selectedYear);
  };

  // Find today's schedule entry
  const todaySchedule = useMemo(() => {
    if (!scheduleData || !scheduleData.jadwal) return null;
    const isCurrentMonthAndYear =
      selectedMonth === currentMonthNum && selectedYear === currentYearNum;

    if (isCurrentMonthAndYear) {
      return (
        scheduleData.jadwal.find((d) => d.tanggal === currentDayNum) ||
        scheduleData.jadwal[0]
      );
    }
    return scheduleData.jadwal[0];
  }, [scheduleData, selectedMonth, selectedYear, currentMonthNum, currentYearNum, currentDayNum]);

  // Determine current/next prayer status for today
  const prayerStatus = useMemo(() => {
    if (!todaySchedule) return null;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const times = [
      { name: "Imsak", mins: timeToMinutes(todaySchedule.imsak), key: "imsak" },
      { name: "Subuh", mins: timeToMinutes(todaySchedule.subuh), key: "subuh" },
      { name: "Terbit", mins: timeToMinutes(todaySchedule.terbit), key: "terbit" },
      { name: "Dhuha", mins: timeToMinutes(todaySchedule.dhuha), key: "dhuha" },
      { name: "Dzuhur", mins: timeToMinutes(todaySchedule.dzuhur), key: "dzuhur" },
      { name: "Ashar", mins: timeToMinutes(todaySchedule.ashar), key: "ashar" },
      { name: "Maghrib", mins: timeToMinutes(todaySchedule.maghrib), key: "maghrib" },
      { name: "Isya", mins: timeToMinutes(todaySchedule.isya), key: "isya" },
    ];

    let next = null;
    let current = null;

    for (let i = 0; i < times.length; i++) {
      if (currentMinutes < times[i].mins) {
        next = times[i];
        current = i > 0 ? times[i - 1] : null;
        break;
      }
    }

    if (!next) {
      // Past Isya, next prayer is Subuh tomorrow
      next = { ...times[1], labelTomorrow: true };
      current = times[times.length - 1]; // Isya
    }

    let diffMinutes = 0;
    if (next) {
      if (next.mins >= currentMinutes) {
        diffMinutes = next.mins - currentMinutes;
      } else {
        // After midnight until Subuh
        diffMinutes = 24 * 60 - currentMinutes + next.mins;
      }
    }

    const hoursLeft = Math.floor(diffMinutes / 60);
    const minsLeft = diffMinutes % 60;
    let countdownText = "";
    if (hoursLeft > 0) {
      countdownText = `${hoursLeft} jam ${minsLeft} menit`;
    } else {
      countdownText = `${minsLeft} menit`;
    }

    return {
      current,
      next,
      countdownText,
      nextKey: next?.key,
    };
  }, [todaySchedule, now]);

  // Jump to today's row in table
  const scrollToToday = () => {
    const el = document.getElementById("table-row-today");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Copy today's prayer times
  const handleCopySchedule = () => {
    if (!todaySchedule || !scheduleData) return;
    const text = `Jadwal Shalat Hari Ini - ${scheduleData.kabkota}, ${scheduleData.provinsi}
Tanggal: ${todaySchedule.hari}, ${todaySchedule.tanggal} ${scheduleData.bulan_nama} ${scheduleData.tahun}

• Imsak: ${todaySchedule.imsak}
• Subuh: ${todaySchedule.subuh}
• Terbit: ${todaySchedule.terbit}
• Dhuha: ${todaySchedule.dhuha}
• Dzuhur: ${todaySchedule.dzuhur}
• Ashar: ${todaySchedule.ashar}
• Maghrib: ${todaySchedule.maghrib}
• Isya: ${todaySchedule.isya}

Sumber Data: Bimas Islam Kemenag RI via Perbaiki Sholatmu (equran.id)`;

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  // Formatted digital time string
  const clockString = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="w-full">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 mb-4 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Bimas Islam Kemenag RI</span>
          <span className="text-emerald-300">|</span>
          <span>517 Kab/Kota</span>
          <span className="text-emerald-300">|</span>
          <span>34 Provinsi</span>
          <span className="text-emerald-300">|</span>
          <span>{selectedYear}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Jadwal Shalat Hari Ini
        </h1>

        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Lihat jadwal shalat harian untuk wilayah Anda. Pilih provinsi,
          kabupaten/kota, dan bulan untuk melihat jadwal lengkap.
        </p>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Provinsi */}
          <div className="flex flex-col">
            <label
              htmlFor="select-provinsi"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Pilih Provinsi</span>
            </label>
            <select
              id="select-provinsi"
              value={selectedProvince}
              onChange={handleProvinceChange}
              className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-pointer"
            >
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* Kabupaten / Kota */}
          <div className="flex flex-col">
            <label
              htmlFor="select-kabkota"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>Pilih Kabupaten/Kota</span>
            </label>
            <select
              id="select-kabkota"
              value={selectedCity}
              onChange={handleCityChange}
              disabled={isLoadingCities || cities.length === 0}
              className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-pointer disabled:opacity-50"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Bulan */}
          <div className="flex flex-col">
            <label
              htmlFor="select-bulan"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Pilih Bulan</span>
            </label>
            <select
              id="select-bulan"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name} {selectedYear}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <svg
            className="w-5 h-5 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Highlight Box: Waktu Shalat Hari Ini */}
      {todaySchedule && scheduleData && (
        <div className="max-w-5xl mx-auto mb-10">
          <div className="bg-white text-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 relative overflow-hidden">
            {/* Background pattern decoration */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-sky-100/50 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Header inside card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Waktu Wilayah
                    </span>
                    <span className="text-gray-500 text-sm">
                      {scheduleData.kabkota}, {scheduleData.provinsi}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {todaySchedule.hari}, {todaySchedule.tanggal}{" "}
                    {scheduleData.bulan_nama} {scheduleData.tahun}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  {/* Digital Clock */}
                  <div className="text-right bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 shadow-2xs">
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                      Waktu Saat Ini
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-700">
                      {clockString}
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopySchedule}
                    className="p-3 bg-gray-50 hover:bg-gray-100 active:scale-95 border border-gray-200 rounded-xl text-gray-700 hover:text-gray-900 transition-all cursor-pointer shadow-2xs"
                    title="Salin Jadwal Hari Ini"
                    aria-label="Salin Jadwal Hari Ini"
                  >
                    {copySuccess ? (
                      <svg
                        className="w-5 h-5 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Countdown Banner */}
              {prayerStatus && prayerStatus.next && (
                <div className="my-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        <polyline
                          points="12 6 12 12 16 14"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-emerald-800/80 font-bold">
                        Menuju Waktu Shalat
                      </div>
                      <div className="text-base font-semibold text-gray-900">
                        Waktu {prayerStatus.next.name} akan tiba dalam{" "}
                        <span className="text-emerald-700 font-bold">
                          {prayerStatus.countdownText}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToToday}
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 hover:text-gray-900 transition-colors cursor-pointer border border-gray-200 shadow-2xs"
                  >
                    Lihat Jadwal 1 Bulan
                  </button>
                </div>
              )}

              {/* 8 Cards of Prayer Times */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
                {PRAYER_KEYS.map((p) => {
                  const timeVal = todaySchedule[p.key] as string;
                  const isNext = prayerStatus?.nextKey === p.key;

                  return (
                    <div
                      key={p.key}
                      className={`relative rounded-2xl p-4 transition-all flex flex-col items-center text-center ${
                        isNext
                          ? "bg-emerald-50 border-2 border-emerald-600 shadow-md shadow-emerald-600/10 scale-105 ring-2 ring-emerald-500/20"
                          : "bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200 shadow-2xs"
                      }`}
                    >
                      {isNext && (
                        <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                          Berikutnya
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium mb-1 ${
                          isNext ? "text-emerald-800 font-bold" : "text-gray-500"
                        }`}
                      >
                        {p.label}
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                          isNext ? "text-emerald-950" : "text-gray-900"
                        }`}
                      >
                        {timeVal || "--:--"}
                      </span>
                      <span
                        className={`text-[10px] mt-1 uppercase tracking-widest ${
                          isNext ? "text-emerald-700 font-bold" : "text-gray-400 font-medium"
                        }`}
                      >
                        {p.isFardhu ? "Fardhu" : "Sunnah"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoadingSchedule && (
        <div className="max-w-5xl mx-auto py-12 text-center text-gray-500">
          <svg
            className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-sm font-medium">Memuat jadwal shalat...</p>
        </div>
      )}

      {/* Full Monthly Schedule Table */}
      {scheduleData && scheduleData.jadwal && !isLoadingSchedule && (
        <div className="max-w-5xl mx-auto mb-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header Table */}
            <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Tabel Jadwal Shalat Bulan {scheduleData.bulan_nama} {scheduleData.tahun}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Wilayah: {scheduleData.kabkota}, {scheduleData.provinsi}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={scrollToToday}
                  className="px-3.5 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Lompat ke Hari Ini
                </button>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3.5 px-4 text-left">Tanggal</th>
                    <th className="py-3.5 px-3 text-center">Hari</th>
                    <th className="py-3.5 px-3 text-center">Imsak</th>
                    <th className="py-3.5 px-3 text-center text-emerald-700 font-bold">Subuh</th>
                    <th className="py-3.5 px-3 text-center">Terbit</th>
                    <th className="py-3.5 px-3 text-center">Dhuha</th>
                    <th className="py-3.5 px-3 text-center text-emerald-700 font-bold">Dzuhur</th>
                    <th className="py-3.5 px-3 text-center text-emerald-700 font-bold">Ashar</th>
                    <th className="py-3.5 px-3 text-center text-emerald-700 font-bold">Maghrib</th>
                    <th className="py-3.5 px-3 text-center text-emerald-700 font-bold">Isya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-xs sm:text-sm">
                  {scheduleData.jadwal.map((item) => {
                    const isToday =
                      selectedMonth === currentMonthNum &&
                      selectedYear === currentYearNum &&
                      item.tanggal === currentDayNum;

                    return (
                      <tr
                        key={item.tanggal}
                        id={isToday ? "table-row-today" : undefined}
                        className={`transition-colors ${
                          isToday
                            ? "bg-emerald-50/90 font-bold text-gray-900 border-l-4 border-emerald-600 shadow-sm"
                            : "hover:bg-gray-50/70 text-gray-700"
                        }`}
                      >
                        <td className="py-3 px-4 font-sans font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{item.tanggal_lengkap}</span>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-600 text-white font-sans">
                                Hari Ini
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-sans font-normal text-gray-600">
                          {item.hari}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-600">{item.imsak}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{item.subuh}</td>
                        <td className="py-3 px-3 text-center text-gray-600">{item.terbit}</td>
                        <td className="py-3 px-3 text-center text-gray-600">{item.dhuha}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{item.dzuhur}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{item.ashar}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{item.maghrib}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{item.isya}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rujukan Shahih & Sumber Resmi (E-E-A-T & Google Helpful Content) */}
      <div className="max-w-5xl mx-auto mb-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Keutamaan Sholat Tepat Waktu */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-4 text-gray-900">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Keutamaan Sholat di Awal Waktu
            </h3>
            <blockquote className="text-sm text-gray-600 italic border-l-2 border-emerald-500 pl-3 my-3">
              "Sesungguhnya shalat itu adalah fardhu yang ditentukan waktunya atas orang-orang yang beriman." (QS. An-Nisa: 103)
            </blockquote>
            <p className="text-sm text-gray-600 leading-relaxed">
              Dari Abdullah bin Mas'ud RA, ia berkata: "Aku bertanya kepada Rasulullah SAW: 'Amal apakah yang paling dicintai oleh Allah?' Beliau menjawab: 'Shalat pada waktunya'." (HR. Bukhari no. 527 dan Muslim no. 85).
            </p>
          </div>
        </div>

        {/* Card Transparansi Sumber Resmi */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Transparansi Sumber Data Resmi
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Seluruh perhitungan dan data jadwal shalat pada aplikasi ini bersumber langsung dari Direktorat Jenderal Bimbingan Masyarakat Islam (Bimas Islam) Kementerian Agama Republik Indonesia melalui API publik EQuran.id. Data diperbarui berkala untuk 517 kabupaten dan kota di 34 provinsi seluruh Indonesia.
            </p>
          </div>
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs font-semibold">
            <a
              href="https://equran.id/apidev/shalat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
            >
              <span>Dokumentasi API EQuran.id</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://bimasislam.kemenag.go.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 underline inline-flex items-center gap-1"
            >
              <span>Bimas Islam Kemenag RI</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
