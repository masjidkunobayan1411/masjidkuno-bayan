"use client";

import React, { useState, useEffect } from "react";
import {
  FileBarChart,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  Shirt,
  MapPin,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Receipt,
  Search,
  Filter,
  ExternalLink,
  Clock,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface TopRankItem {
  label: string;
  total: number;
}

interface PopularProduct {
  product_id: string;
  nama_produk: string;
  total_disewa: number;
  total_pendapatan: number;
}

interface DailyTrendItem {
  tanggal: string;
  kunjungan: number;
  pengunjung: number;
  dewasa: number;
  anak: number;
}

interface DailyOmsetItem {
  tanggal: string;
  total: number;
  tunai: number;
  qris: number;
}

interface TransactionReportItem {
  transaction_id: string;
  visit_id: string;
  nama_pengunjung: string;
  tanggal_transaksi: string;
  metode_pembayaran: string;
  nominal_sewa: number;
  total_harga: number;
  status_pembayaran: string;
  status_transaksi: string;
  total_barang: number;
  nama_petugas?: string;
  dibuat_pada?: string;
}

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<"VISITS" | "FINANCE" | "TRANSACTIONS">("VISITS");

  // Date Range State
  const [preset, setPreset] = useState<"TODAY" | "7DAYS" | "MONTH" | "YEAR" | "ALL">("MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Report Data
  const [visitsReport, setVisitsReport] = useState<any>(null);
  const [financeReport, setFinanceReport] = useState<any>(null);
  const [transactionList, setTransactionList] = useState<TransactionReportItem[]>([]);

  // Filter & Pagination Tab Transaksi
  const [trxSearch, setTrxSearch] = useState("");
  const [trxStatusBayarFilter, setTrxStatusBayarFilter] = useState("ALL");
  const [trxMetodeFilter, setTrxMetodeFilter] = useState("ALL");
  const [trxPage, setTrxPage] = useState(1);
  const trxPerPage = 10;

  // Inisialisasi Rentang Tanggal Berdasarkan Preset
  const setDatesByPreset = (selectedPreset: "TODAY" | "7DAYS" | "MONTH" | "YEAR" | "ALL") => {
    setPreset(selectedPreset);
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(now);
    let newStart = "";
    let newEnd = "";

    if (selectedPreset === "TODAY") {
      newStart = todayStr;
      newEnd = todayStr;
    } else if (selectedPreset === "7DAYS") {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      newStart = formatDate(past7);
      newEnd = todayStr;
    } else if (selectedPreset === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      newStart = formatDate(firstDay);
      newEnd = todayStr;
    } else if (selectedPreset === "YEAR") {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      newStart = formatDate(firstDayYear);
      newEnd = todayStr;
    } else if (selectedPreset === "ALL") {
      newStart = "";
      newEnd = "";
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    fetchReportData(newStart, newEnd);
  };

  useEffect(() => {
    // Cek parameter query tab dari URL jika ada
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab")?.toUpperCase();
      if (tabParam === "TRANSACTIONS" || tabParam === "TRANSAKSI") {
        setActiveTab("TRANSACTIONS");
      } else if (tabParam === "FINANCE" || tabParam === "KEUANGAN") {
        setActiveTab("FINANCE");
      } else if (tabParam === "VISITS" || tabParam === "KUNJUNGAN" || tabParam === "DEMOGRAFIS") {
        setActiveTab("VISITS");
      }
    }
    setDatesByPreset("MONTH");
  }, []);

  // Fetch Report Data dari API
  const fetchReportData = async (
    targetStart?: string,
    targetEnd?: string,
    isManual = false
  ) => {
    if (isManual) setRefreshing(true);
    setLoading(true);
    setErrorMessage("");

    const sDate = targetStart !== undefined ? targetStart : startDate;
    const eDate = targetEnd !== undefined ? targetEnd : endDate;

    try {
      const params = new URLSearchParams();
      params.append("type", "all");
      if (sDate) params.append("start_date", sDate);
      if (eDate) params.append("end_date", eDate);
      params.append("_t", Date.now().toString());

      const res = await fetch(`/api/reports/analytics?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setVisitsReport(json.data.visits);
        setFinanceReport(json.data.financial);
        setTransactionList(json.data.transactions || json.data.financial?.transaksi_items || []);
        setTrxPage(1);
      } else {
        setErrorMessage(json.message || "Gagal memuat data laporan analitik.");
      }
    } catch (err: any) {
      setErrorMessage("Koneksi gagal saat memuat laporan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handler Download Excel (.xlsx)
  const handleExportExcel = () => {
    setExporting(true);
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const exportUrl = `/api/reports/export?${params.toString()}`;
    const link = document.createElement("a");
    link.href = exportUrl;
    link.setAttribute("download", `Laporan_Bayan_Visitor.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExporting(false), 2000);
  };

  // Metrik Ringkasan Terhitung
  const totalKunjungan = visitsReport?.ringkasan?.total_kunjungan || 0;
  const totalPengunjung = visitsReport?.ringkasan?.total_pengunjung || 0;
  const totalDewasa = visitsReport?.ringkasan?.total_dewasa || 0;
  const totalAnak = visitsReport?.ringkasan?.total_anak || 0;

  const totalPendapatan = financeReport?.ringkasan?.total_pendapatan || 0;
  const totalTunai = financeReport?.ringkasan?.total_tunai || 0;
  const totalQris = financeReport?.ringkasan?.total_qris || 0;
  const totalQrisBayannesia = financeReport?.ringkasan?.total_qris_bayannesia || 0;
  const totalQrisBumdes = financeReport?.ringkasan?.total_qris_bumdes || 0;

  // Data Pie Chart Demografi
  const pieDemografiData = [
    {
      name: "Domestik (Nusantara)",
      value: visitsReport?.jenis_pengunjung?.DOMESTIK || 0,
      color: "#1c2b21", // bayan-900
    },
    {
      name: "Mancanegara (Asing)",
      value: visitsReport?.jenis_pengunjung?.MANCANEGARA || 0,
      color: "#d4af37", // bayan-gold
    },
  ];

  // Data Pie Chart Pembayaran
  const pieBayarData = [
    { name: "Tunai (Cash)", value: totalTunai, color: "#059669" },
    ...(totalQrisBayannesia > 0 || totalQrisBumdes > 0
      ? [
          { name: "QRIS Bayannesia", value: totalQrisBayannesia, color: "#0284c7" },
          { name: "QRIS BUMDes", value: totalQrisBumdes, color: "#f59e0b" },
        ]
      : [{ name: "QRIS", value: totalQris, color: "#0284c7" }]),
  ];

  // Helper Format Tanggal WITA (Asia/Makassar)
  const formatDateWita = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return (
        new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Makassar",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d) + " WITA"
      );
    } catch {
      return String(dateStr);
    }
  };

  // Filter Daftar Transaksi (Tab 3)
  const filteredTransactions = transactionList.filter((item) => {
    // 1. Filter Pencarian Teks
    if (trxSearch.trim()) {
      const q = trxSearch.toLowerCase().trim();
      const matchTrxId = (item.transaction_id || "").toLowerCase().includes(q);
      const matchNama = (item.nama_pengunjung || "").toLowerCase().includes(q);
      const matchMetode = (item.metode_pembayaran || "").toLowerCase().includes(q);
      if (!matchTrxId && !matchNama && !matchMetode) return false;
    }

    // 2. Filter Status Pembayaran
    if (trxStatusBayarFilter !== "ALL") {
      if (item.status_pembayaran !== trxStatusBayarFilter) return false;
    }

    // 3. Filter Metode Pembayaran
    if (trxMetodeFilter !== "ALL") {
      const m = String(item.metode_pembayaran || "").toUpperCase();
      if (trxMetodeFilter === "TUNAI" && !m.includes("TUNAI")) return false;
      if (trxMetodeFilter === "BAYANNESIA" && !m.includes("BAYANNESIA")) return false;
      if (trxMetodeFilter === "BUMDES" && !m.includes("BUMDES")) return false;
    }

    return true;
  });

  // Perhitungan Pagination Tab Transaksi
  const totalTrxPages = Math.max(1, Math.ceil(filteredTransactions.length / trxPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (trxPage - 1) * trxPerPage,
    trxPage * trxPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center shadow-sm">
              <FileBarChart className="w-5 h-5" />
            </div>
            <span>Laporan & Statistik Analitik</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analisis operasional kunjungan, sebaran demografi, pendapatan kasir sewa, dan ekspor resmi Excel (.xlsx).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchReportData(startDate, endDate, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-bayan-700 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all active:scale-95 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            )}
            <span>Unduh Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Toolbar Filter Periode WITA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Presets Button */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Periode:
          </span>
          <button
            type="button"
            onClick={() => setDatesByPreset("TODAY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              preset === "TODAY"
                ? "bg-bayan-800 text-white"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setDatesByPreset("7DAYS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              preset === "7DAYS"
                ? "bg-bayan-800 text-white"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => setDatesByPreset("MONTH")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              preset === "MONTH"
                ? "bg-bayan-800 text-white"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => setDatesByPreset("YEAR")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              preset === "YEAR"
                ? "bg-bayan-800 text-white"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            Tahun Ini
          </button>
          <button
            type="button"
            onClick={() => setDatesByPreset("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              preset === "ALL"
                ? "bg-bayan-800 text-white"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            Semua
          </button>
        </div>

        {/* Date Inputs Kustom */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              const val = e.target.value;
              setStartDate(val);
              setPreset("ALL");
              fetchReportData(val, endDate);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-medium"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              const val = e.target.value;
              setEndDate(val);
              setPreset("ALL");
              fetchReportData(startDate, val);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-medium"
          />
        </div>
      </div>

      {/* Pesan Kesalahan */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid 4 Kartu Metrik Periode Terpilih */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kunjungan Sesi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Total Sesi Kunjungan
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {totalKunjungan}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Nomor Tiket Terbit</span>
        </div>

        {/* Total Pengunjung */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Total Pengunjung
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-bayan-800 font-mono">
            {totalPengunjung}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">
            {totalDewasa} Dewasa • {totalAnak} Anak
          </span>
        </div>

        {/* Total Pendapatan Sewa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Pendapatan Sewa Lunas
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
            Rp{totalPendapatan.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            {financeReport?.ringkasan?.total_transaksi_sukses || 0} Transaksi Lunas
          </span>
        </div>

        {/* Kas Tunai vs QRIS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Pembagian Kas
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 space-y-1 mt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Tunai:</span>
              <span className="text-emerald-700">Rp{totalTunai.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">QRIS Total:</span>
              <span className="text-sky-700">Rp{totalQris.toLocaleString("id-ID")}</span>
            </div>
            {(totalQrisBayannesia > 0 || totalQrisBumdes > 0) && (
              <div className="pt-1 mt-1 border-t border-slate-100 text-[11px] space-y-0.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">• QRIS Bayannesia:</span>
                  <span className="text-slate-700">Rp{totalQrisBayannesia.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">• QRIS BUMDes:</span>
                  <span className="text-slate-700">Rp{totalQrisBumdes.toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigasi Laporan */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("VISITS")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "VISITS"
              ? "border-bayan-800 text-bayan-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Laporan Kunjungan & Demografis</span>
          {totalPengunjung > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              {totalPengunjung}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("FINANCE")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "FINANCE"
              ? "border-bayan-800 text-bayan-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Laporan Keuangan & Sewa Busana</span>
          {totalPendapatan > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-mono">
              Rp{(totalPendapatan / 1000).toFixed(0)}k
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TRANSACTIONS")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "TRANSACTIONS"
              ? "border-bayan-800 text-bayan-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Laporan Transaksi</span>
          {transactionList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-bayan-100 text-bayan-800 font-mono">
              {transactionList.length}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: LAPORAN KUNJUNGAN & DEMOGRAFIS                                 */}
      {/* ==================================================================== */}
      {activeTab === "VISITS" && (
        <div className="space-y-6">
          {/* Grafik Tren Kunjungan Harian */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-bayan-700" />
                <span>Tren Kunjungan Harian (Wisatawan Dewasa vs Anak-anak)</span>
              </h3>
              <span className="text-[11px] text-slate-400">WITA Timezone</span>
            </div>

            <div className="h-64 w-full">
              {visitsReport?.deret_harian && visitsReport.deret_harian.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={visitsReport.deret_harian}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorDewasa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1c2b21" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1c2b21" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAnak" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="tanggal"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "1rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area
                      type="monotone"
                      dataKey="dewasa"
                      name="Pengunjung Dewasa"
                      stroke="#1c2b21"
                      fillOpacity={1}
                      fill="url(#colorDewasa)"
                    />
                    <Area
                      type="monotone"
                      dataKey="anak"
                      name="Pengunjung Anak"
                      stroke="#d4af37"
                      fillOpacity={1}
                      fill="url(#colorAnak)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada data kunjungan untuk rentang waktu ini.
                </div>
              )}
            </div>
          </div>

          {/* Grid Sebaran Demografis (Pie Chart & Tabel Top Provinsi) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart Domestik vs Mancanegara */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
              <h3 className="font-serif font-bold text-sm text-slate-900">
                Komposisi Asal Wisatawan
              </h3>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDemografiData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {pieDemografiData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "1rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs">
                {pieDemografiData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{d.value} Orang</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabel Top 10 Asal Provinsi */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-bayan-700" />
                  <span>Top Asal Provinsi Wisatawan Domestik</span>
                </h3>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                      <th className="py-2.5 px-4">Provinsi</th>
                      <th className="py-2.5 px-4 text-right">Pengunjung</th>
                      <th className="py-2.5 px-4 text-right">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {visitsReport?.top_provinsi && visitsReport.top_provinsi.length > 0 ? (
                      visitsReport.top_provinsi.map((item: TopRankItem, idx: number) => {
                        const pct =
                          totalPengunjung > 0 ? ((item.total / totalPengunjung) * 100).toFixed(1) : 0;
                        return (
                          <tr key={item.label} className="hover:bg-slate-50/70 font-sans">
                            <td className="py-2.5 px-4 text-center font-bold text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {item.label}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                              {item.total} orang
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Belum ada data demografis provinsi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Grid Top Kabupaten & Mancanegara */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Kabupaten/Kota */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-slate-900">
                Top Asal Kabupaten / Kota
              </h3>
              <div className="space-y-2 text-xs">
                {visitsReport?.top_kabupaten_kota && visitsReport.top_kabupaten_kota.length > 0 ? (
                  visitsReport.top_kabupaten_kota.map((item: TopRankItem, idx: number) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{item.label}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{item.total} orang</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs block py-4 text-center">
                    Belum ada data.
                  </span>
                )}
              </div>
            </div>

            {/* Top Negara Mancanegara */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-bayan-gold" />
                <span>Top Negara Wisatawan Mancanegara</span>
              </h3>
              <div className="space-y-2 text-xs">
                {visitsReport?.top_negara_mancanegara &&
                visitsReport.top_negara_mancanegara.length > 0 ? (
                  visitsReport.top_negara_mancanegara.map((item: TopRankItem, idx: number) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-bayan-100 text-bayan-900 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{item.label}</span>
                      </div>
                      <span className="font-mono font-bold text-bayan-900">
                        {item.total} orang
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs block py-4 text-center">
                    Belum ada pengunjung mancanegara terdaftar.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: LAPORAN KEUANGAN & SEWA PAKAIAN ADAT                          */}
      {/* ==================================================================== */}
      {activeTab === "FINANCE" && (
        <div className="space-y-6">
          {/* Grafik Pendapatan Harian */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Tren Pendapatan Harian (Tunai vs QRIS)</span>
              </h3>
              <span className="text-[11px] text-slate-400">Rupiah (IDR)</span>
            </div>

            <div className="h-64 w-full">
              {financeReport?.omset_harian && financeReport.omset_harian.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={financeReport.omset_harian}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="tanggal"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "1rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                      formatter={(val: any) => [`Rp${Number(val).toLocaleString("id-ID")}`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="tunai" name="Tunai (Cash)" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="qris" name="QRIS" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada transaksi sewa lunas pada periode ini.
                </div>
              )}
            </div>
          </div>

          {/* Produk Pakaian Adat Terpopuler */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-bayan-700" />
              <span>Peringkat Pakaian Adat Paling Sering Disewa</span>
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-4">Nama Busana Adat</th>
                    <th className="py-2.5 px-4 text-center">Frekuensi Disewa</th>
                    <th className="py-2.5 px-4 text-right">Total Pendapatan (Rp)</th>
                    <th className="py-2.5 px-4 text-right">Kontribusi Omset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financeReport?.produk_terpopuler &&
                  financeReport.produk_terpopuler.length > 0 ? (
                    financeReport.produk_terpopuler.map((p: PopularProduct, idx: number) => {
                      const pct =
                        totalPendapatan > 0
                          ? ((p.total_pendapatan / totalPendapatan) * 100).toFixed(1)
                          : 0;
                      return (
                        <tr key={p.product_id || idx} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.nama_produk}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-bayan-800">
                            {p.total_disewa} kali
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                            Rp{Number(p.total_pendapatan).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{pct}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada data penyewaan produk.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: LAPORAN TRANSAKSI SEWA & PEMBAYARAN                           */}
      {/* ==================================================================== */}
      {activeTab === "TRANSACTIONS" && (
        <div className="space-y-6">
          {/* Header Card & Filter Toolbar */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-bayan-700" />
                  <span>Daftar Laporan Transaksi Sewa & Pembayaran</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Rekapitulasi riwayat transaksi penyewaan pakaian adat, identitas pengunjung, metode pembayaran, nominal sewa, dan status pembayaran.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">
                  Total: <strong className="text-slate-900">{filteredTransactions.length}</strong> Transaksi
                </span>
              </div>
            </div>

            {/* Filter Search, Status, & Metode */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
              {/* Search Box */}
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari No. Transaksi, Nama Pengunjung..."
                  value={trxSearch}
                  onChange={(e) => {
                    setTrxSearch(e.target.value);
                    setTrxPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-bayan-600 focus:border-transparent placeholder:text-slate-400"
                />
              </div>

              {/* Filter Status Pembayaran */}
              <div className="sm:col-span-4">
                <select
                  value={trxStatusBayarFilter}
                  onChange={(e) => {
                    setTrxStatusBayarFilter(e.target.value);
                    setTrxPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-bayan-600"
                >
                  <option value="ALL">Semua Status Pembayaran</option>
                  <option value="LUNAS">LUNAS</option>
                  <option value="BELUM_DIBAYAR">BELUM DIBAYAR</option>
                  <option value="MENUNGGU_VERIFIKASI">MENUNGGU VERIFIKASI</option>
                </select>
              </div>

              {/* Filter Metode Pembayaran */}
              <div className="sm:col-span-3">
                <select
                  value={trxMetodeFilter}
                  onChange={(e) => {
                    setTrxMetodeFilter(e.target.value);
                    setTrxPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-bayan-600"
                >
                  <option value="ALL">Semua Metode Bayar</option>
                  <option value="TUNAI">TUNAI</option>
                  <option value="BAYANNESIA">QRIS BAYANNESIA</option>
                  <option value="BUMDES">QRIS BUMDES</option>
                </select>
              </div>
            </div>

            {/* Quick Stat Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Transaksi Terfilter
                </span>
                <span className="text-base font-extrabold text-slate-800 font-mono">
                  {filteredTransactions.length}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70">
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                  Total Nominal Sewa
                </span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  Rp{filteredTransactions.reduce((acc, t) => acc + (t.nominal_sewa || t.total_harga || 0), 0).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200/70">
                <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider block">
                  Sewa Lunas
                </span>
                <span className="text-base font-extrabold text-sky-800 font-mono">
                  {filteredTransactions.filter((t) => t.status_pembayaran === "LUNAS").length} Transaksi
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70">
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                  Belum / Menunggu
                </span>
                <span className="text-base font-extrabold text-amber-800 font-mono">
                  {filteredTransactions.filter((t) => t.status_pembayaran !== "LUNAS").length} Transaksi
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Utama Laporan Transaksi */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">No. Transaksi</th>
                    <th className="py-3.5 px-4">Nama Pengunjung</th>
                    <th className="py-3.5 px-4 text-center">Tanggal Transaksi</th>
                    <th className="py-3.5 px-4 text-center">Metode Pembayaran</th>
                    <th className="py-3.5 px-4 text-right">Nominal Sewa</th>
                    <th className="py-3.5 px-4 text-center">Status Pembayaran</th>
                    <th className="py-3.5 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((trx, idx) => {
                      const rowNum = (trxPage - 1) * trxPerPage + idx + 1;
                      const isLunas = trx.status_pembayaran === "LUNAS";
                      const isMenunggu = trx.status_pembayaran === "MENUNGGU_VERIFIKASI";
                      const metode = String(trx.metode_pembayaran || "TUNAI").toUpperCase();
                      const isBayannesia = metode.includes("BAYANNESIA");
                      const isBumdes = metode.includes("BUMDES");
                      const isQris = metode.includes("QRIS") || isBayannesia || isBumdes;

                      return (
                        <tr key={trx.transaction_id || idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* 1. No */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                            {rowNum}
                          </td>

                          {/* 2. No. Transaksi */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-bold text-slate-900 block">
                              {trx.transaction_id}
                            </span>
                            {trx.visit_id && (
                              <span className="text-[10px] text-slate-400 block">
                                Tiket: {trx.visit_id}
                              </span>
                            )}
                          </td>

                          {/* 3. Nama Pengunjung */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 block">
                              {trx.nama_pengunjung || "-"}
                            </span>
                            {trx.nama_petugas && (
                              <span className="text-[10px] text-slate-400 block">
                                Kasir: {trx.nama_petugas}
                              </span>
                            )}
                          </td>

                          {/* 4. Tanggal Transaksi */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-mono text-slate-700 text-[11px] block">
                              {formatDateWita(trx.tanggal_transaksi)}
                            </span>
                          </td>

                          {/* 5. Metode Pembayaran */}
                          <td className="py-3.5 px-4 text-center">
                            {isBayannesia ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                                Payment QRIS BAYANNESIA (Kain Poleng)
                              </span>
                            ) : isBumdes ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                Payment QRIS BUMDES BAYAN (Kain Batik)
                              </span>
                            ) : isQris ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                                QRIS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                TUNAI
                              </span>
                            )}
                          </td>

                          {/* 6. Nominal Sewa */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="font-extrabold text-slate-900 text-xs">
                              Rp{(trx.nominal_sewa || trx.total_harga || 0).toLocaleString("id-ID")}
                            </span>
                            {trx.total_barang > 0 && (
                              <span className="text-[10px] text-slate-400 block font-sans">
                                {trx.total_barang} item busana
                              </span>
                            )}
                          </td>

                          {/* 7. Status Pembayaran */}
                          <td className="py-3.5 px-4 text-center">
                            {isLunas ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                LUNAS
                              </span>
                            ) : isMenunggu ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                <Clock className="w-3 h-3 text-sky-600" />
                                MENUNGGU VERIFIKASI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                BELUM DIBAYAR
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            <a
                              href={`/dashboard/transaksi/${trx.transaction_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-bayan-800 hover:text-white text-slate-700 text-[11px] font-semibold transition-all border border-slate-200"
                              title="Buka Faktur / Invoice Transaksi"
                            >
                              <span>Invoice</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="block font-medium">
                          Tidak ada data transaksi yang sesuai dengan filter atau periode ini.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredTransactions.length > trxPerPage && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-mono">
                  Menampilkan {(trxPage - 1) * trxPerPage + 1} -{" "}
                  {Math.min(trxPage * trxPerPage, filteredTransactions.length)} dari{" "}
                  {filteredTransactions.length} transaksi
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTrxPage((p) => Math.max(1, p - 1))}
                    disabled={trxPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-mono font-bold text-slate-700">
                    Halaman {trxPage} dari {totalTrxPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setTrxPage((p) => Math.min(totalTrxPages, p + 1))}
                    disabled={trxPage === totalTrxPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
