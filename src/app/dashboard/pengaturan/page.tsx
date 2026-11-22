"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Clock,
  MapPin,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Globe2,
  DollarSign,
  QrCode,
  Landmark,
  Save,
  Loader2,
  Server,
  Sparkles,
  Image as ImageIcon,
  FolderOpen,
  Camera,
  Upload,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: string; time: string; latency?: number } | null>(
    null
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Settings state
  const [jamBuka, setJamBuka] = useState("09:00");
  const [jamTutup, setJamTutup] = useState("17:00");
  const [dendaRusak, setDendaRusak] = useState(50000);
  const [dendaHilang, setDendaHilang] = useState(100000);
  const [metodeTunai, setMetodeTunai] = useState(true);
  const [metodeQris, setMetodeQris] = useState(true);

  // Media Manager state
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    key: string;
    message: string;
    success: boolean;
  } | null>(null);
  const [mediaTimestamps, setMediaTimestamps] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/") || file.type.includes("svg")) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.78
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadMedia = async (key: string, file: File) => {
    try {
      setUploadingKey(key);
      setUploadFeedback(null);

      // Kompres otomatis gambar sebelum diunggah agar ringan (~50-80KB) dan muat di cloud database
      const processedFile = await compressImageIfNeeded(file);

      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("targetKey", key);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengunggah foto.");
      }

      setMediaTimestamps((prev) => ({
        ...prev,
        [key]: Date.now(),
      }));

      setUploadFeedback({
        key,
        message: data.message || "Foto berhasil diperbarui dan aktif di website!",
        success: true,
      });

      setTimeout(() => {
        setUploadFeedback((prev) => (prev?.key === key ? null : prev));
      }, 6000);
    } catch (err: any) {
      setUploadFeedback({
        key,
        message: err.message || "Terjadi kesalahan saat mengunggah foto.",
        success: false,
      });
    } finally {
      setUploadingKey(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        const list = json.data.settings || [];
        list.forEach((item: any) => {
          if (item.nama_pengaturan === "jam_operasional_buka") setJamBuka(item.nilai);
          if (item.nama_pengaturan === "jam_operasional_tutup") setJamTutup(item.nilai);
          if (item.nama_pengaturan === "denda_rusak_default") setDendaRusak(Number(item.nilai) || 50000);
          if (item.nama_pengaturan === "denda_hilang_default") setDendaHilang(Number(item.nilai) || 100000);
        });
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePingTest = async () => {
    setPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping" }),
      });
      const latency = Math.round(performance.now() - start);
      const json = await res.json();

      if (json.success) {
        setPingResult({
          status: "ONLINE",
          time: new Date().toLocaleTimeString("id-ID"),
          latency,
        });
      } else {
        setPingResult({
          status: "STANDBY",
          time: new Date().toLocaleTimeString("id-ID"),
          latency,
        });
      }
    } catch (err) {
      setPingResult({
        status: "ERROR",
        time: new Date().toLocaleTimeString("id-ID"),
      });
    } finally {
      setPinging(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          settings: {
            jam_operasional_buka: jamBuka,
            jam_operasional_tutup: jamTutup,
            denda_rusak_default: dendaRusak,
            denda_hilang_default: dendaHilang,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan perubahan pengaturan.");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error("Gagal menyimpan pengaturan:", err);
      setSaveError(err.message || "Terjadi kesalahan saat menyimpan pengaturan.");
      setTimeout(() => setSaveError(null), 6000);
    } finally {
      setSavingSettings(false);
    }
  };

  const relasionalSheets = [
    { name: "ADMIN", desc: "Kredensial & peran admin/super admin" },
    { name: "PENGUNJUNG", desc: "Data perwakilan & profil wisatawan" },
    { name: "KUNJUNGAN", desc: "Buku tamu registrasi rombongan & tiket" },
    { name: "PRODUK", desc: "Master pakaian adat (Poleng, Batik, Sapuk)" },
    { name: "INVENTARIS", desc: "Pelacakan fisik unit pakaian adat per barcode" },
    { name: "TRANSAKSI", desc: "Data transaksi sewa pakaian & kasir" },
    { name: "DETAIL_TRANSAKSI", desc: "Rincian item pakaian adat yang disewa" },
    { name: "PEMBAYARAN", desc: "Catatan penerimaan kas Tunai & QRIS" },
    { name: "PENGEMBALIAN", desc: "Rekonsiliasi unit kembali & denda" },
    { name: "LOG_AKTIVITAS", desc: "Audit trail pencatatan aktivitas sistem" },
    { name: "PENGATURAN", desc: "Konfigurasi parameter operasional situs" },
  ];

  const mediaItems = [
    {
      key: "jejak-peradaban",
      title: "Foto Banner Jejak Peradaban (Arsitektur)",
      category: "Cagar Budaya",
      filename: "jejak-peradaban.jpg",
      folder: "public/media/photos/heritage/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\jejak-peradaban.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\",
      src: "/api/media/custom/jejak-peradaban",
      fallback: "/media/photos/heritage/masjid-kuno.svg",
      desc: "Foto arsitektur pasak bambu pada banner biru 'Jejak Peradaban Leluhur Bayan'",
      locationLabel: "Beranda: Bagian Warisan Sejarah & Jejak Peradaban (Banner Biru)",
      siteUrl: "/#sejarah",
      featured: true,
    },
    {
      key: "hero-bayan",
      title: "Foto Full-Width Hero Utama",
      category: "Beranda Utama",
      filename: "hero-bayan.jpg",
      folder: "public/media/photos/heritage/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\hero-bayan.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\",
      src: "/api/media/custom/hero-bayan",
      fallback: "/media/photos/heritage/hero-bayan.svg",
      desc: "Foto panorama paling atas pada halaman utama website",
      locationLabel: "Beranda: Bagian Paling Atas (Hero Banner)",
      siteUrl: "/#beranda",
    },
    {
      key: "qris-bayannesia",
      title: "Barcode QRIS BAYANNESIA (Kain Poleng)",
      category: "Kasir Pembayaran",
      filename: "qris-bayannesia.jpg",
      folder: "public/media/qris/",
      fullPath: "d:\\BAYNEX\\public\\media\\qris\\qris-bayannesia.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\qris\\",
      src: "/api/media/custom/qris-bayannesia",
      fallback: "/media/qris/qris-bayannesia.jpg",
      desc: "Barcode Payment QRIS resmi Bayannesia khusus untuk pembayaran sewa Kain Poleng",
      locationLabel: "Kasir: Pembayaran QRIS BAYANNESIA (Kain Poleng)",
      siteUrl: "/dashboard/transaksi",
    },
    {
      key: "qris-bumdes",
      title: "Barcode QRIS BUMDES BAYAN (Kain Batik)",
      category: "Kasir Pembayaran",
      filename: "qris-bumdes.jpg",
      folder: "public/media/qris/",
      fullPath: "d:\\BAYNEX\\public\\media\\qris\\qris-bumdes.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\qris\\",
      src: "/api/media/custom/qris-bumdes",
      fallback: "/media/qris/qris-bumdes.jpg",
      desc: "Barcode Payment QRIS resmi BUMDes Bayan khusus untuk pembayaran sewa Kain Batik",
      locationLabel: "Kasir: Pembayaran QRIS BUMDES BAYAN (Kain Batik)",
      siteUrl: "/dashboard/transaksi",
    },
    {
      key: "logo",
      title: "Logo Utama Website",
      category: "Identitas Brand",
      filename: "logo.jpg",
      folder: "public/media/logo/",
      fullPath: "d:\\BAYNEX\\public\\media\\logo\\logo.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\logo\\",
      src: "/api/media/custom/logo",
      fallback: "/media/logo/logo.svg",
      desc: "Logo website pada navbar, tiket QR, formulir tamu, dan dashboard",
      locationLabel: "Seluruh Halaman: Navbar, Tiket, Kasir, Dashboard",
      siteUrl: "/",
    },
    {
      key: "masjid-kuno",
      title: "Foto 1: Kompleks Masjid Kuno",
      category: "Galeri Foto",
      filename: "masjid-kuno.jpg",
      folder: "public/media/photos/heritage/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\masjid-kuno.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\",
      src: "/api/media/custom/masjid-kuno",
      fallback: "/media/photos/heritage/masjid-kuno.svg",
      desc: "Foto cagar budaya bangunan utama Masjid Kuno Bayan abad ke-16",
      locationLabel: "Beranda: Galeri Suasana & Jejak Sejarah (Foto 1: Masjid Kuno)",
      siteUrl: "/#lokasi",
    },
    {
      key: "makam-wali",
      title: "Foto 2: Makam Para Wali & Sesepuh",
      category: "Galeri Foto",
      filename: "makam-wali.jpg",
      folder: "public/media/photos/heritage/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\makam-wali.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\heritage\\",
      src: "/api/media/custom/makam-wali",
      fallback: "/media/photos/heritage/makam-wali.svg",
      desc: "Foto kompleks pemakaman suci para wali dan sesepuh adat Bayan",
      locationLabel: "Beranda: Galeri Suasana & Jejak Sejarah (Foto 2: Makam Wali)",
      siteUrl: "/#lokasi",
    },
    {
      key: "kainpoleng",
      title: "Kain Poleng Sasak / Bayan",
      category: "Katalog Busana Adat",
      filename: "kainpoleng.jpg",
      folder: "public/media/photos/products/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\products\\kainpoleng.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\products\\",
      src: "/api/media/custom/kainpoleng",
      fallback: "/media/photos/products/kainpoleng.svg",
      desc: "Kain adat motif kotak hitam-putih khas cagar budaya Bayan",
      locationLabel: "Beranda: Katalog Sewa Pakaian Adat",
      siteUrl: "/#pakaian-adat",
    },
    {
      key: "kainbatik",
      title: "Kain Batik Sasak Lombok",
      category: "Katalog Busana Adat",
      filename: "kainbatik.jpg",
      folder: "public/media/photos/products/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\products\\kainbatik.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\products\\",
      src: "/api/media/custom/kainbatik",
      fallback: "/media/photos/products/kainbatik.svg",
      desc: "Kain batik tenun motif khas suku Sasak Lombok",
      locationLabel: "Beranda: Katalog Sewa Pakaian Adat",
      siteUrl: "/#pakaian-adat",
    },
    {
      key: "sapukjong",
      title: "Sapuk & jong",
      category: "Katalog Busana Adat",
      filename: "sapukjong.jpg",
      folder: "public/media/photos/products/",
      fullPath: "d:\\BAYNEX\\public\\media\\photos\\products\\sapukjong.jpg",
      folderPath: "d:\\BAYNEX\\public\\media\\photos\\products\\",
      src: "/api/media/custom/sapukjong",
      fallback: "/media/photos/products/sapukjong.svg",
      desc: "Ikat kepala pria adat Sasak dan sabuk pengikat wanita",
      locationLabel: "Beranda: Katalog Sewa Pakaian Adat",
      siteUrl: "/#pakaian-adat",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-serif">
                  Pengaturan Sistem &amp; Operasional
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-500 border border-amber-400/30 uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Konfigurasi jam operasional cagar budaya, tarif denda, dan koneksi Google Apps Script
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handlePingTest}
          disabled={pinging}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-xs transition-all"
        >
          <Server className={`w-3.5 h-3.5 ${pinging ? "animate-pulse text-blue-600" : "text-slate-400"}`} />
          <span>{pinging ? "Menguji Koneksi..." : "Uji Koneksi Backend"}</span>
        </button>
      </div>

      {/* Notifikasi Hasil Ping Test */}
      {pingResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            pingResult.status === "ONLINE"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Koneksi Google Apps Script Web App: <strong>{pingResult.status}</strong>{" "}
              {pingResult.latency && `(${pingResult.latency} ms)`} pada {pingResult.time} WITA.
            </span>
          </div>
          <button onClick={() => setPingResult(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pengaturan operasional berhasil disimpan ke database Google Spreadsheet!</span>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-rose-600 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      {/* FORM PENGATURAN OPERASIONAL */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Jam Operasional & Landasan Adat */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                Jam Operasional &amp; Identitas Kawasan
              </h3>
              <p className="text-xs text-slate-400">
                Jadwal kunjungan resmi cagar budaya Masjid Kuno Bayan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Buka Kunjungan (WITA)
              </label>
              <input
                type="text"
                value={jamBuka}
                onChange={(e) => setJamBuka(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Tutup Kunjungan (WITA)
              </label>
              <input
                type="text"
                value={jamTutup}
                onChange={(e) => setJamTutup(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Situs Resmi
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Masjid Kuno Bayan, Desa Bayan, Kecamatan Bayan, Lombok Utara, NTB (Zona Waktu: Asia/Makassar - WITA, UTC+8)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Denda & Kebijakan Perlindungan Pakaian Adat */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                Tarif Denda Standar Perlindungan Inventaris
              </h3>
              <p className="text-xs text-slate-400">
                Kompensasi perbaikan dan penggantian kain adat rusak / hilang saat kunjungan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Denda Standar Pakaian Adat Rusak (Rp)
              </label>
              <input
                type="number"
                value={dendaRusak}
                onChange={(e) => setDendaRusak(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Biaya penjahitan ulang / pencucian khusus serat kain tenun
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Denda Standar Pakaian Adat Hilang (Rp)
              </label>
              <input
                type="number"
                value={dendaHilang}
                onChange={(e) => setDendaHilang(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Biaya pengadaan kain tenun adat Sasak baru
              </span>
            </div>
          </div>
        </div>

        {/* 3. Metode Pembayaran QRIS DANA (Bayannesia & BUMDes Bayan) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                  Metode Pembayaran QRIS (Bayannesia &amp; BUMDes Bayan)
                </h3>
                <p className="text-xs text-slate-400">
                  Dukungan 2 merchant QRIS terpisah: Kain Poleng (Bayannesia) &amp; Kain Batik (BUMDes Bayan)
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
              DUAL QRIS AKTIF
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kartu 1: QRIS BAYANNESIA (Kain Poleng) */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    Khusus Kain Poleng
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    Payment QRIS BAYANNESIA
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Merchant resmi penerimaan sewa busana adat Kain Poleng (Bayannesia).
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <img
                  src={`/api/media/custom/qris-bayannesia${
                    mediaTimestamps["qris-bayannesia"]
                      ? `?t=${mediaTimestamps["qris-bayannesia"]}`
                      : ""
                  }`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/media/qris/qris-bayannesia.jpg";
                  }}
                  alt="Preview QRIS BAYANNESIA"
                  className="w-36 h-auto max-h-48 mx-auto object-contain rounded-lg shadow-xs"
                />
                <code className="text-[10px] text-slate-500 font-mono block mt-2">
                  public/media/qris/qris-bayannesia.jpg
                </code>
              </div>
            </div>

            {/* Kartu 2: QRIS BUMDES BAYAN (Kain Batik) */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                    Khusus Kain Batik
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    Payment QRIS BUMDES BAYAN
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Merchant resmi penerimaan sewa busana adat Kain Batik (BUMDes Bayan).
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <img
                  src={`/api/media/custom/qris-bumdes${
                    mediaTimestamps["qris-bumdes"]
                      ? `?t=${mediaTimestamps["qris-bumdes"]}`
                      : ""
                  }`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/media/qris/qris-bumdes.jpg";
                  }}
                  alt="Preview QRIS BUMDES BAYAN"
                  className="w-36 h-auto max-h-48 mx-auto object-contain rounded-lg shadow-xs"
                />
                <code className="text-[10px] text-slate-500 font-mono block mt-2">
                  public/media/qris/qris-bumdes.jpg
                </code>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs space-y-1">
            <span className="font-bold block">Cara Mengganti Barcode Masing-Masing QRIS:</span>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              Anda dapat memperbarui barcode QRIS masing-masing kapan saja menggunakan tombol <strong>"Ganti Foto"</strong> pada bagian <strong>Pengelolaan Seluruh Foto &amp; Media Website</strong> di bawah, atau dengan menyalin file gambar ke folder <code>public/media/qris/</code> dengan nama <code>qris-bayannesia.jpg</code> dan <code>qris-bumdes.jpg</code>.
            </p>
          </div>
        </div>

        {/* 4. Pengelolaan Seluruh Foto & Media Website (Media Manager) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                  Pengelolaan Seluruh Foto &amp; Media Website
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar seluruh foto website, lokasi folder, nama file, dan pratinjau yang sedang aktif
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Folder: public/media/
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Dua Cara Mudah Mengganti Foto di Website Bayan Visitor:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-800/50">
                <span className="font-bold text-blue-700 dark:text-blue-400 block mb-0.5">
                  1. Cara Otomatis (Lewat Tombol Unggah):
                </span>
                Klik tombol <strong>"Ganti Foto"</strong> pada kartu foto di bawah. Pilih file gambar dari HP atau laptop Anda. Foto akan langsung tersimpan ke sistem dan berganti seketika di website!
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-800/50">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                  2. Cara Manual (Lewat Folder Komputer):
                </span>
                Klik tombol <strong>Salin Path Folder</strong>, buka File Explorer di komputer Anda, lalu salin foto Anda ke folder tersebut dengan nama file yang sesuai.
              </div>
            </div>
          </div>

          {/* Grid Pratinjau Foto Media */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mediaItems.map((item) => {
              const isUploading = uploadingKey === item.key;
              const feedback = uploadFeedback?.key === item.key ? uploadFeedback : null;
              const isCopied = copiedKey === item.key;

              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3.5 ${
                    item.featured
                      ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-400 dark:border-amber-500 shadow-md ring-2 ring-amber-400/30"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge Khusus jika Featured */}
                    {item.featured && (
                      <div className="flex items-center justify-between pb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-3 h-3" /> FOTO YANG DITANYAKAN
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 font-serif">
                          Banner Jejak Peradaban
                        </span>
                      </div>
                    )}

                    {/* Preview Image */}
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 relative">
                      <img
                        src={`${item.src}${
                          mediaTimestamps[item.key]
                            ? `?t=${mediaTimestamps[item.key]}`
                            : ""
                        }`}
                        onError={(e) => {
                          e.currentTarget.src = item.fallback;
                        }}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-xs text-[10px] font-bold text-white border border-white/10">
                        {item.category}
                      </span>
                      {isUploading && (
                        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-semibold gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                          <span>Mengunggah foto baru...</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {item.desc}
                      </p>
                    </div>

                    {/* Info Letak & Folder */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 text-[10px] space-y-1.5">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">
                          Letak Tampilan di Website:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {item.locationLabel}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">File &amp; Folder:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.filename}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Status Alert */}
                  {feedback && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
                        feedback.success
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200"
                      }`}
                    >
                      {feedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-medium leading-tight">{feedback.message}</span>
                    </div>
                  )}

                  {/* Tombol Interaktif: Upload & Salin Path */}
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Label Input File sebagai Tombol Upload */}
                      <label
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          isUploading
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : item.featured
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Ganti Foto Ini</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadMedia(item.key, file);
                            }
                            // Reset input agar dapat memilih berkas yang sama jika diulang
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {/* Tombol Buka di Halaman Web */}
                      <a
                        href={item.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        title="Lihat Bagian Ini di Halaman Web"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Tombol Salin Path Folder Laptop */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.fullPath, item.key)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200/60 dark:border-slate-700/60"
                      title="Salin path file lengkap di laptop"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="font-semibold text-emerald-600">Path Tersalin ke Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="truncate">Salin Path Folder Laptop</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Status Database Google Spreadsheet (11 Sheet) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                Integrasi 11 Sheet Relasional Google Spreadsheet
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan data cloud transparan yang dimiliki mutlak oleh pengelola adat Bayan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {relasionalSheets.map((sheet) => (
              <div
                key={sheet.name}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white block">
                    {sheet.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                    {sheet.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingSettings}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all transform ${
              savingSettings
                ? "bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:-translate-y-0.5 cursor-pointer"
            }`}
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
