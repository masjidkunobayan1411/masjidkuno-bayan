"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shirt,
  Receipt,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface MetricData {
  waktu_server: string;
  tanggal_hari_ini: string;
  bulan_ini: string;
  hari_ini: {
    kunjungan: number;
    pengunjung: number;
    dewasa: number;
    anak: number;
    pendapatan: number;
  };
  bulan_ini_data: {
    kunjungan: number;
    pengunjung: number;
    dewasa: number;
    anak: number;
    pendapatan: number;
  };
  sewa_aktif: number;
  unit_sedang_dipakai?: number;
  demografi_bulan_ini: {
    domestik: number;
    mancanegara: number;
  };
  inventaris: {
    total: number;
    tersedia: number;
    disewa: number;
    ditahan: number;
    perawatan: number;
    rusak: number;
    hilang: number;
  };
  grafik_tren_7_hari: {
    tanggal: string;
    kunjungan: number;
    pengunjung: number;
    dewasa: number;
    anak: number;
  }[];
  aktivitas_terkini: {
    log_id: string;
    admin_id: string;
    aktivitas: string;
    objek: string;
    objek_id: string;
    waktu: string;
    keterangan: string;
  }[];
}

const DEMO_COLORS = ["#1b4332", "#d4af37"];

export default function DashboardMetricsView() {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setData(json.data);
      } else {
        setErrorMessage(json.message || "Gagal memuat metrik real-time.");
      }
    } catch (err: any) {
      setErrorMessage("Koneksi ke server gagal saat memperbarui metrik.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh setiap 60 detik
    const timer = setInterval(() => fetchMetrics(), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 animate-spin text-bayan-700 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Menghubungkan ke database & memuat metrik real-time...
        </p>
      </div>
    );
  }

  // Data Pie Chart Demografi
  const pieData = [
    { name: "Domestik", value: data?.demografi_bulan_ini?.domestik || 0 },
    { name: "Mancanegara", value: data?.demografi_bulan_ini?.mancanegara || 0 },
  ];
  const hasDemographyData =
    (data?.demografi_bulan_ini?.domestik || 0) +
      (data?.demografi_bulan_ini?.mancanegara || 0) >
    0;

  return (
    <div className="space-y-8">
      {/* Baris Kontrol & Timestamp Pembaruan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Ringkasan Statistik & Operasional</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data teragregasi langsung dari Google Spreadsheet • Zona WITA
          </p>
        </div>

        <div className="flex items-center gap-2">
          {errorMessage && (
            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              {errorMessage}
            </span>
          )}

          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
            title="Perbarui Data Sekarang"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-bayan-700 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span>{refreshing ? "Memperbarui..." : "Perbarui Data"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. KARTU METRIK UTAMA (KEY METRIC CARDS)                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Pengunjung Hari Ini */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pengunjung Hari Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-bayan-50 text-bayan-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {data?.hari_ini?.pengunjung || 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Orang</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{data?.hari_ini?.kunjungan || 0} Sesi Kunjungan</span>
            <span className="font-semibold text-bayan-800">
              {data?.hari_ini?.dewasa || 0} Dws • {data?.hari_ini?.anak || 0} Ank
            </span>
          </div>
        </div>

        {/* Card 2: Pengunjung Bulan Ini */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pengunjung Bulan Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {data?.bulan_ini_data?.pengunjung || 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Orang</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{data?.bulan_ini_data?.kunjungan || 0} Sesi Kunjungan</span>
            <span className="font-semibold text-emerald-700">
              Bulan {data?.bulan_ini || "Berjalan"}
            </span>
          </div>
        </div>

        {/* Card 3: Penyewaan Pakaian Aktif */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Penyewaan Aktif
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Shirt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700 font-mono">
              {data?.unit_sedang_dipakai ?? data?.inventaris?.disewa ?? data?.sewa_aktif ?? 0}
            </span>
            <span className="text-xs font-medium text-slate-500">
              Unit Sedang Dipakai
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sesi Transaksi Aktif:</span>
            <span className="font-bold text-amber-700">
              {data?.sewa_aktif || 0} Transaksi
            </span>
          </div>
        </div>

        {/* Card 4: Pendapatan Sewa Bulan Ini */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pendapatan Sewa Bulan Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatRupiah(data?.bulan_ini_data?.pendapatan || 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Hari Ini:</span>
            <span className="font-bold text-slate-800">
              {formatRupiah(data?.hari_ini?.pendapatan || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. GRAFIK TREN & DIAGRAM KOMPOSISI PENGUNJUNG                        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Tren 7 Hari Terakhir (AreaChart Recharts) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Tren Kunjungan 7 Hari Terakhir
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jumlah orang pengunjung per tanggal pencatatan
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-bayan-800 bg-bayan-50 px-3 py-1 rounded-full border border-bayan-200">
              <span className="w-2 h-2 rounded-full bg-bayan-700" />
              <span>Pengunjung Harian</span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.grafik_tren_7_hari || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPengunjung" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b4332" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1b4332" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="tanggal"
                  tickFormatter={(val) => {
                    const parts = String(val).split("-");
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                  }}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} Orang`, "Pengunjung"]}
                  labelFormatter={(lbl: any) => `Tanggal: ${lbl}`}
                  contentStyle={{
                    backgroundColor: "#081c15",
                    borderColor: "#1b4332",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pengunjung"
                  stroke="#1b4332"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPengunjung)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagram Komposisi Pengunjung: Domestik vs Mancanegara */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Komposisi Pengunjung Bulan Ini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan Domestik vs Mancanegara
            </p>

            <div className="h-52 w-full mt-3 flex items-center justify-center">
              {hasDemographyData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={DEMO_COLORS[index % DEMO_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val} Orang`, ""]}
                      contentStyle={{
                        backgroundColor: "#081c15",
                        borderColor: "#1b4332",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs font-semibold text-slate-700">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center p-6 bg-slate-50 rounded-2xl w-full border border-dashed border-slate-200">
                  <PieIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">
                    Belum ada data demografi bulan ini
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-bayan-50/60 p-2.5 rounded-xl border border-bayan-100">
              <span className="block text-[11px] text-bayan-800 font-semibold">
                Domestik
              </span>
              <span className="font-extrabold text-sm text-bayan-950 font-mono">
                {data?.demografi_bulan_ini?.domestik || 0}
              </span>
            </div>
            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
              <span className="block text-[11px] text-amber-800 font-semibold">
                Mancanegara
              </span>
              <span className="font-extrabold text-sm text-amber-950 font-mono">
                {data?.demografi_bulan_ini?.mancanegara || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. DAFTAR RIWAYAT AKTIVITAS TERKINI (ACTIVITY LOG FEED)              */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Daftar Riwayat Aktivitas & Transaksi Terkini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit jejak aktivitas operasional tercatat pada sheet LOG_AKTIVITAS
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            10 Aktivitas Terakhir
          </span>
        </div>

        {data?.aktivitas_terkini && data.aktivitas_terkini.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">Waktu (WITA)</th>
                  <th className="pb-3 px-3">Petugas</th>
                  <th className="pb-3 px-3">Aktivitas</th>
                  <th className="pb-3 px-3">Objek / ID</th>
                  <th className="pb-3 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.aktivitas_terkini.map((act, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-600 font-mono whitespace-nowrap">
                      {act.waktu || "-"}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {act.admin_id || "SISTEM"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                        {act.aktivitas}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {act.objek_id || "-"}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {act.keterangan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              Belum ada riwayat aktivitas yang tercatat hari ini
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Aktivitas pendaftaran kunjungan dan sewa pakaian akan otomatis muncul di sini
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
