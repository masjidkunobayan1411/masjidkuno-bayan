"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Landmark,
  ArrowLeft,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Phone,
  Building2,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import {
  PROVINSI_INDONESIA,
  KABUPATEN_NTB,
  POPULAR_COUNTRIES,
  TUJUAN_KUNJUNGAN_LIST,
} from "@/lib/regions";
import { Language } from "@/lib/i18n";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegistrasiPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ID");

  useEffect(() => {
    const savedLang = localStorage.getItem("bayan_lang") as Language;
    if (savedLang === "ID" || savedLang === "EN") {
      setLang(savedLang);
    }
  }, []);

  // Form State
  const [namaPengunjung, setNamaPengunjung] = useState("");
  const [jenisPengunjung, setJenisPengunjung] = useState<"DOMESTIK" | "MANCANEGARA">("DOMESTIK");
  const [provinsi, setProvinsi] = useState("Nusa Tenggara Barat");
  const [kabupatenKota, setKabupatenKota] = useState("Kabupaten Lombok Utara");
  const [negara, setNegara] = useState("Indonesia");
  const [nomorTelepon, setNomorTelepon] = useState("");
  const [asalInstansi, setAsalInstansi] = useState("");
  const [jumlahDewasa, setJumlahDewasa] = useState(1);
  const [jumlahAnak, setJumlahAnak] = useState(0);
  const [tujuanKunjungan, setTujuanKunjungan] = useState("Wisata Budaya");
  const [persetujuanData, setPersetujuanData] = useState(false);

  // Status Form
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Kalkulasi Otomatis Total Pengunjung
  const totalPengunjung = Number(jumlahDewasa || 0) + Number(jumlahAnak || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setValidationErrors([]);

    // Client-side Validation
    const errs: string[] = [];
    if (!namaPengunjung.trim()) {
      errs.push(lang === "ID" ? "Nama perwakilan rombongan wajib diisi." : "Representative name is required.");
    }
    if (totalPengunjung < 1) {
      errs.push(lang === "ID" ? "Total pengunjung minimal 1 orang." : "Total visitors must be at least 1 person.");
    }
    if (jenisPengunjung === "DOMESTIK") {
      if (!provinsi.trim()) errs.push(lang === "ID" ? "Provinsi wajib dipilih." : "Province is required.");
      if (!kabupatenKota.trim()) errs.push(lang === "ID" ? "Kabupaten/Kota wajib diisi." : "City/Regency is required.");
    } else {
      if (!negara.trim() || negara === "Indonesia") {
        errs.push(lang === "ID" ? "Negara asal mancanegara wajib dipilih." : "Country of origin is required.");
      }
    }
    if (!persetujuanData) {
      errs.push(
        lang === "ID"
          ? "Anda wajib menyetujui tata tertib cagar budaya dan persetujuan data."
          : "You must agree to cultural heritage guidelines and data consent."
      );
    }

    // Validasi Nomor Telepon / WhatsApp (Opsional, hanya diperiksa jika diisi)
    if (nomorTelepon.trim()) {
      const cleanPhone = nomorTelepon.replace(/[\s\-\(\)]/g, "");
      if (!/^\+?[0-9]{8,16}$/.test(cleanPhone)) {
        errs.push(
          lang === "ID"
            ? "Format nomor WhatsApp / HP tidak valid (contoh: 08123456789 atau kosongkan jika tidak ada)."
            : "Invalid WhatsApp / phone format (e.g. +628123456789 or leave blank)."
        );
      }
    }

    if (errs.length > 0) {
      setValidationErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        nama_pengunjung: namaPengunjung,
        jenis_pengunjung: jenisPengunjung,
        negara: jenisPengunjung === "DOMESTIK" ? "Indonesia" : negara,
        provinsi: jenisPengunjung === "DOMESTIK" ? provinsi : "-",
        kabupaten_kota: jenisPengunjung === "DOMESTIK" ? kabupatenKota : "-",
        nomor_telepon: nomorTelepon.trim() || "-",
        asal_instansi: asalInstansi || "Umum / Pribadi",
        jumlah_dewasa: jumlahDewasa,
        jumlah_anak: jumlahAnak,
        total_pengunjung: totalPengunjung,
        tujuan_kunjungan: tujuanKunjungan,
        bahasa: lang,
        persetujuan_data: true,
      };

      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Gagal melakukan pendaftaran. Silakan coba kembali.");
        if (json.errors && Array.isArray(json.errors)) {
          setValidationErrors(json.errors);
        }
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Berhasil -> Buka Halaman Tiket
      const ticketData = json.data;
      if (ticketData && ticketData.visit_id) {
        router.push(`/tiket/${ticketData.visit_id}`);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMessage("Terjadi gangguan jaringan atau server tidak merespons.");
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      {/* Header Registrasi */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "ID" ? "Kembali ke Beranda" : "Back to Home"}</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="w-6 h-6 rounded-lg bg-blue-600/80 p-0.5 flex items-center justify-center overflow-hidden border border-blue-500/50">
                <img
                  src="/media/logo/logo.png"
                  onError={(e) => {
                    e.currentTarget.src = "/media/logo/logo.svg";
                  }}
                  alt="Logo Bayan"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs font-serif font-bold text-amber-300">
                BAYAN VISITOR
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Banner Pengantar */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500 mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            {lang === "ID" ? "Formulir Pendaftaran Pengunjung" : "Visitor Registration Form"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl mx-auto">
            {lang === "ID"
              ? "Silakan isi data kunjungan Anda atau rombongan sebelum memasuki kawasan cagar budaya Masjid Kuno Bayan."
              : "Please register your visit details prior to entering the Ancient Bayan Mosque cultural heritage sanctuary."}
          </p>
        </div>

        {/* Notifikasi Error jika ada */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm shadow-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <div className="leading-relaxed">
              <p className="font-semibold">{errorMessage}</p>
              {validationErrors.length > 0 && (
                <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-xs">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Formulir Pendaftaran */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Data Identitas Pengunjung */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-bayan-100 text-bayan-800 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>{lang === "ID" ? "Identitas Pengunjung / Perwakilan" : "Visitor Identification"}</span>
            </h2>

            <div className="space-y-5">
              {/* Nama Pengunjung */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {lang === "ID" ? "Nama Lengkap Perwakilan *" : "Full Name of Representative *"}
                </label>
                <input
                  type="text"
                  value={namaPengunjung}
                  onChange={(e) => setNamaPengunjung(e.target.value)}
                  placeholder={lang === "ID" ? "Contoh: Budi Santoso" : "e.g. John Doe"}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-slate-50/50 hover:bg-white focus:bg-white"
                />
              </div>

              {/* Pilihan Jenis Pengunjung */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {lang === "ID" ? "Kategori Pengunjung *" : "Visitor Category *"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setJenisPengunjung("DOMESTIK");
                      setNegara("Indonesia");
                      setProvinsi("Nusa Tenggara Barat");
                      setKabupatenKota("Kabupaten Lombok Utara");
                    }}
                    className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      jenisPengunjung === "DOMESTIK"
                        ? "bg-bayan-800 text-white border-bayan-800 shadow-md shadow-bayan-900/10"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>Domestik (Nusantara)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJenisPengunjung("MANCANEGARA");
                      setNegara("Australia");
                      setProvinsi("-");
                      setKabupatenKota("-");
                    }}
                    className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      jenisPengunjung === "MANCANEGARA"
                        ? "bg-bayan-800 text-white border-bayan-800 shadow-md shadow-bayan-900/10"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>Mancanegara (International)</span>
                  </button>
                </div>
              </div>

              {/* Asal Wilayah Dinamis */}
              {jenisPengunjung === "DOMESTIK" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Provinsi */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Provinsi Asal *
                    </label>
                    <select
                      value={provinsi}
                      onChange={(e) => {
                        setProvinsi(e.target.value);
                        if (e.target.value === "Nusa Tenggara Barat") {
                          setKabupatenKota("Kabupaten Lombok Utara");
                        } else {
                          setKabupatenKota("");
                        }
                      }}
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-white"
                    >
                      {PROVINSI_INDONESIA.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kabupaten / Kota */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Kabupaten / Kota *
                    </label>
                    {provinsi === "Nusa Tenggara Barat" ? (
                      <select
                        value={kabupatenKota}
                        onChange={(e) => setKabupatenKota(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-white"
                      >
                        {KABUPATEN_NTB.map((kab) => (
                          <option key={kab} value={kab}>
                            {kab}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={kabupatenKota}
                        onChange={(e) => setKabupatenKota(e.target.value)}
                        placeholder="Contoh: Kota Surabaya / Kab. Bandung"
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-slate-50/50 hover:bg-white focus:bg-white"
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Mancanegara: Negara Asal */
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Country of Origin / Negara Asal *
                  </label>
                  <select
                    value={negara}
                    onChange={(e) => setNegara(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-white"
                  >
                    {POPULAR_COUNTRIES.map((ctry) => (
                      <option key={ctry} value={ctry}>
                        {ctry}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kontak & Instansi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {lang === "ID" ? "Nomor WhatsApp / HP" : "WhatsApp / Phone Number"}
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">
                      {lang === "ID" ? "(Opsional)" : "(Optional)"}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={nomorTelepon}
                      onChange={(e) => setNomorTelepon(e.target.value)}
                      placeholder={lang === "ID" ? "081234567890 (Boleh dikosongkan)" : "e.g. +6281234567890 (Optional)"}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-slate-50/50 hover:bg-white focus:bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {lang === "ID"
                      ? "Boleh dikosongkan jika Anda tidak ingin menerima notifikasi via WhatsApp."
                      : "Optional. Leave blank if you do not wish to receive notifications via WhatsApp."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {lang === "ID" ? "Asal Instansi / Komunitas" : "Organization / Institution"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={asalInstansi}
                      onChange={(e) => setAsalInstansi(e.target.value)}
                      placeholder={lang === "ID" ? "Umum / Nama Instansi" : "General / Company / University"}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 focus:border-bayan-500 text-sm bg-slate-50/50 hover:bg-white focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Jumlah Pengunjung & Tujuan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-bayan-100 text-bayan-800 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>{lang === "ID" ? "Detail Jumlah & Tujuan Kunjungan" : "Visit Details & Headcount"}</span>
            </h2>

            <div className="space-y-6">
              {/* Jumlah Dewasa & Anak dengan Perhitungan Otomatis */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Pengunjung Dewasa */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {lang === "ID" ? "Pengunjung Dewasa *" : "Adult Visitors *"}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setJumlahDewasa(Math.max(0, jumlahDewasa - 1))}
                        disabled={isLoading || jumlahDewasa <= 0}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={jumlahDewasa}
                        onChange={(e) => setJumlahDewasa(Math.max(0, parseInt(e.target.value) || 0))}
                        disabled={isLoading}
                        className="w-20 text-center py-2.5 rounded-xl border border-slate-300 font-bold text-base bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setJumlahDewasa(jumlahDewasa + 1)}
                        disabled={isLoading}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +
                      </button>
                      <span className="text-xs text-slate-500 font-medium">Orang</span>
                    </div>
                  </div>

                  {/* Pengunjung Anak */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {lang === "ID" ? "Pengunjung Anak" : "Child Visitors"}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setJumlahAnak(Math.max(0, jumlahAnak - 1))}
                        disabled={isLoading || jumlahAnak <= 0}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={jumlahAnak}
                        onChange={(e) => setJumlahAnak(Math.max(0, parseInt(e.target.value) || 0))}
                        disabled={isLoading}
                        className="w-20 text-center py-2.5 rounded-xl border border-slate-300 font-bold text-base bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setJumlahAnak(jumlahAnak + 1)}
                        disabled={isLoading}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +
                      </button>
                      <span className="text-xs text-slate-500 font-medium">Orang</span>
                    </div>
                  </div>
                </div>

                {/* Badge Total Otomatis */}
                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {lang === "ID" ? "Total Rombongan:" : "Total Group Size:"}
                  </span>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-bayan-800 text-bayan-gold rounded-full text-sm font-extrabold shadow-sm">
                    <Users className="w-4 h-4" />
                    <span>{totalPengunjung} Orang</span>
                  </div>
                </div>
              </div>

              {/* Tujuan Kunjungan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {lang === "ID" ? "Tujuan Kunjungan *" : "Purpose of Visit *"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TUJUAN_KUNJUNGAN_LIST.map((item) => (
                    <label
                      key={item.id}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        tujuanKunjungan === item.id
                          ? "bg-bayan-50 border-bayan-700 text-bayan-900 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tujuan_kunjungan"
                        value={item.id}
                        checked={tujuanKunjungan === item.id}
                        onChange={(e) => setTujuanKunjungan(e.target.value)}
                        className="text-bayan-700 focus:ring-bayan-500"
                      />
                      <span className="text-xs font-semibold">
                        {lang === "ID" ? item.label_id : item.label_en}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Persetujuan Tata Tertib & Privasi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-bayan-100 text-bayan-800 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>{lang === "ID" ? "Persetujuan Norma & Tata Tertib" : "Cultural Consent & Compliance"}</span>
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <span className="font-bold">Pengingat Penting Pengelola:</span> Seluruh pengunjung yang memasuki kawasan sakral Masjid Kuno Bayan wajib mengenakan pakaian adat (Kain Poleng/Kain Batik/Sarung).
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={persetujuanData}
                  onChange={(e) => setPersetujuanData(e.target.checked)}
                  required
                  className="mt-1 w-4 h-4 text-bayan-700 rounded border-slate-300 focus:ring-bayan-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  {lang === "ID"
                    ? "Saya menyetujui data kunjungan ini dicatat untuk keperluan pengelolaan cagar budaya dan bersedia mematuhi norma adat serta tata tertib yang berlaku di Masjid Kuno Bayan."
                    : "I agree that this visit data is recorded for heritage site administration and commit to adhering to customary etiquette at Ancient Bayan Mosque."}
                </span>
              </label>
            </div>
          </div>

          {/* Tombol Submit Pendaftaran */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-bayan-gold via-amber-400 to-yellow-500 text-bayan-950 font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-bayan-gold/25 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{lang === "ID" ? "Memproses Pendaftaran..." : "Registering Visit..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{lang === "ID" ? "Kirim Pendaftaran & Buat E-Tiket" : "Submit Registration & Get E-Ticket"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
