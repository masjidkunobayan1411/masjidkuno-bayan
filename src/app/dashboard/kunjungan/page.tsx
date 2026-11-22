"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  QrCode,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MapPin,
  Globe2,
  Phone,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";

interface VisitRecord {
  visit_id: string;
  visitor_id: string;
  tanggal_kunjungan: string;
  jam_kunjungan: string;
  jumlah_dewasa: number;
  jumlah_anak: number;
  total_pengunjung: number;
  tujuan_kunjungan: string;
  status_kunjungan: string;
  catatan?: string;
  qr_code_url?: string;
  dibuat_pada: string;
  nama_pengunjung: string;
  jenis_pengunjung: string;
  negara: string;
  provinsi: string;
  kabupaten_kota: string;
  asal_instansi?: string;
  nomor_telepon?: string;
}

export default function BukuKunjunganPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchVisits = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      let url = `/api/visits?status=${statusFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (dateFilter) url += `&tanggal=${dateFilter}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setVisits(json.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat buku kunjungan:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [statusFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVisits(true);
  };

  const handleResetSearch = () => {
    setSearchQuery("");
    setDateFilter("");
    setStatusFilter("ALL");
  };

  // Filter real-time di sisi client untuk pencarian cepat responsif
  const displayVisits = visits.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (v.visit_id && v.visit_id.toLowerCase().includes(q)) ||
      (v.visitor_id && v.visitor_id.toLowerCase().includes(q)) ||
      (v.nama_pengunjung && v.nama_pengunjung.toLowerCase().includes(q)) ||
      (v.asal_instansi && v.asal_instansi.toLowerCase().includes(q)) ||
      (v.nomor_telepon && v.nomor_telepon.toLowerCase().includes(q)) ||
      (v.kabupaten_kota && v.kabupaten_kota.toLowerCase().includes(q)) ||
      (v.provinsi && v.provinsi.toLowerCase().includes(q)) ||
      (v.negara && v.negara.toLowerCase().includes(q)) ||
      (v.tujuan_kunjungan && v.tujuan_kunjungan.toLowerCase().includes(q)) ||
      (v.status_kunjungan && v.status_kunjungan.toLowerCase().includes(q))
    );
  });

  const handleUpdateStatus = async (visit_id: string, newStatus: string) => {
    setUpdatingId(visit_id);
    try {
      const res = await fetch("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setVisits((prev) =>
          prev.map((v) => (v.visit_id === visit_id ? { ...v, status_kunjungan: newStatus } : v))
        );
        if (selectedVisit && selectedVisit.visit_id === visit_id) {
          setSelectedVisit({ ...selectedVisit, status_kunjungan: newStatus });
        }
      } else {
        alert(json.message || "Gagal mengubah status kunjungan.");
      }
    } catch (err: any) {
      alert("Terjadi gangguan jaringan saat memperbarui status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Kalkulasi Metrik Kunjungan
  const totalRombongan = visits.length;
  const totalOrang = visits.reduce((acc, v) => acc + (Number(v.total_pengunjung) || 0), 0);
  const totalDomestik = visits.filter((v) => v.jenis_pengunjung === "DOMESTIK").length;
  const totalMancanegara = visits.filter((v) => v.jenis_pengunjung === "MANCANEGARA").length;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-serif">
                Buku Tamu &amp; Kunjungan Wisatawan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Data registrasi digital peziarah dan wisatawan Cagar Budaya Masjid Kuno Bayan
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/kunjungan/scan"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QR Presensi (HP)</span>
          </Link>

          <button
            onClick={() => fetchVisits(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Segarkan</span>
          </button>

          <Link
            href="/registrasi"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <span>+ Form Tamu Baru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Total Rombongan
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
              {totalRombongan}
            </span>
            <span className="text-xs text-slate-400">grup</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Total Wisatawan
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-serif">
              {totalOrang}
            </span>
            <span className="text-xs text-slate-400">jiwa</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Domestik
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif">
              {totalDomestik}
            </span>
            <span className="text-xs text-slate-400">rombongan</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Mancanegara
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-serif">
              {totalMancanegara}
            </span>
            <span className="text-xs text-slate-400">rombongan</span>
          </div>
        </div>
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama perwakilan, Visit ID (VST-...), no. HP, atau wilayah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchVisits(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
          {/* Filter Tanggal */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-[10px] text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Status</option>
            <option value="TERDAFTAR">Terdaftar</option>
            <option value="TERVERIFIKASI">Terverifikasi</option>
            <option value="SELESAI">Selesai</option>
            <option value="BATAL">Batal</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Buku Kunjungan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm font-semibold">Memuat buku kunjungan...</p>
          </div>
        ) : displayVisits.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Belum ada data kunjungan yang cocok
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || dateFilter || statusFilter !== "ALL"
                ? `Tidak ditemukan kunjungan dengan kata kunci "${searchQuery || "filter terpilih"}". Coba gunakan kata kunci lain.`
                : "Belum ada wisatawan atau rombongan yang terdaftar di sistem."}
            </p>
            {(searchQuery || dateFilter || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors mt-2"
              >
                Reset Filter &amp; Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  <th className="py-3.5 px-4">Visit ID</th>
                  <th className="py-3.5 px-4">Tanggal &amp; Waktu</th>
                  <th className="py-3.5 px-4">Nama Perwakilan</th>
                  <th className="py-3.5 px-4">Asal Wilayah</th>
                  <th className="py-3.5 px-4">Rombongan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayVisits.map((visit) => {
                  const isDomestik = visit.jenis_pengunjung === "DOMESTIK";
                  const asalWilayah = isDomestik
                    ? `${visit.kabupaten_kota || ""}, ${visit.provinsi || ""}`
                    : visit.negara || "Mancanegara";

                  return (
                    <tr
                      key={visit.visit_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Visit ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {visit.visit_id}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {visit.tujuan_kunjungan}
                        </span>
                      </td>

                      {/* Tanggal & Waktu */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {visit.tanggal_kunjungan}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {visit.jam_kunjungan} WITA
                        </span>
                      </td>

                      {/* Nama Perwakilan & Kontak */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {visit.nama_pengunjung}
                        </span>
                        {visit.nomor_telepon && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {visit.nomor_telepon}
                          </span>
                        )}
                      </td>

                      {/* Asal Wilayah */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isDomestik ? (
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Globe2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[150px] font-medium text-slate-700 dark:text-slate-300">
                            {asalWilayah}
                          </span>
                        </div>
                      </td>

                      {/* Rombongan */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/50 dark:border-blue-900/50">
                          <span>{visit.total_pengunjung} Orang</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {visit.jumlah_dewasa} dws • {visit.jumlah_anak} ank
                        </span>
                      </td>

                      {/* Status Kunjungan */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                            visit.status_kunjungan === "TERVERIFIKASI"
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : visit.status_kunjungan === "TERDAFTAR"
                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                              : visit.status_kunjungan === "SELESAI"
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                              : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                          }`}
                        >
                          {visit.status_kunjungan}
                        </span>
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Buka E-Tiket QR */}
                          <Link
                            href={`/tiket/${visit.visit_id}`}
                            target="_blank"
                            title="Buka E-Tiket QR"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                          </Link>

                          {/* Kasir Sewa Pakaian */}
                          <Link
                            href={`/dashboard/transaksi/baru?visit_id=${visit.visit_id}`}
                            title="Buat Transaksi Sewa Kain Adat"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </Link>

                          {/* Lihat Detail Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedVisit(visit)}
                            title="Rincian Lengkap"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETAIL KUNJUNGAN */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Detail Kunjungan Wisatawan
                </span>
                <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white mt-0.5">
                  {selectedVisit.nama_pengunjung}
                </h3>
                <span className="font-mono text-xs text-slate-400">{selectedVisit.visit_id}</span>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Kategori Pengunjung
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {selectedVisit.jenis_pengunjung}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Total Rombongan
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {selectedVisit.total_pengunjung} Orang ({selectedVisit.jumlah_dewasa} Dws,{" "}
                  {selectedVisit.jumlah_anak} Anak)
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Asal Daerah / Negara
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {selectedVisit.jenis_pengunjung === "DOMESTIK"
                    ? `${selectedVisit.kabupaten_kota}, ${selectedVisit.provinsi}`
                    : selectedVisit.negara}
                </span>
                {selectedVisit.asal_instansi && (
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Instansi: {selectedVisit.asal_instansi}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tanggal &amp; Waktu
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {selectedVisit.tanggal_kunjungan} • {selectedVisit.jam_kunjungan} WITA
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {selectedVisit.status_kunjungan}
                </span>
              </div>
            </div>

            {/* Aksi Ubah Status */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
              {selectedVisit.status_kunjungan === "TERDAFTAR" && (
                <button
                  type="button"
                  disabled={updatingId === selectedVisit.visit_id}
                  onClick={() => handleUpdateStatus(selectedVisit.visit_id, "TERVERIFIKASI")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Verifikasi Kehadiran</span>
                </button>
              )}

              {selectedVisit.status_kunjungan !== "SELESAI" && (
                <button
                  type="button"
                  disabled={updatingId === selectedVisit.visit_id}
                  onClick={() => handleUpdateStatus(selectedVisit.visit_id, "SELESAI")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Tandai Selesai</span>
                </button>
              )}

              {selectedVisit.status_kunjungan !== "BATAL" && (
                <button
                  type="button"
                  disabled={updatingId === selectedVisit.visit_id}
                  onClick={() => handleUpdateStatus(selectedVisit.visit_id, "BATAL")}
                  className="py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs transition-colors"
                >
                  Batalkan
                </button>
              )}

              <Link
                href={`/tiket/${selectedVisit.visit_id}`}
                target="_blank"
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Buka Tiket QR</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
