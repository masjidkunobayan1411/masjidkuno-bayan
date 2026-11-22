"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  XCircle,
  ArrowRight,
  Calendar,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { Transaction } from "@/types";

export default function TransaksiListPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTrxFilter, setStatusTrxFilter] = useState("ALL");
  const [statusBayarFilter, setStatusBayarFilter] = useState("ALL");

  const fetchTransactions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      if (statusTrxFilter !== "ALL") params.append("status_transaksi", statusTrxFilter);
      if (statusBayarFilter !== "ALL") params.append("status_pembayaran", statusBayarFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setTransactions(json.data.items || []);
      } else {
        setErrorMessage(json.message || "Gagal memuat daftar transaksi.");
      }
    } catch (err: any) {
      setErrorMessage("Koneksi ke server gagal saat memuat transaksi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusTrxFilter, statusBayarFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Metrik Ringkasan Transaksi
  const totalTrx = transactions.length;
  const trxMenungguBayar = transactions.filter(
    (t) => t.status_pembayaran === "BELUM_DIBAYAR" && t.status_transaksi !== "DIBATALKAN"
  ).length;
  const trxAktif = transactions.filter((t) => t.status_transaksi === "DISEWA").length;
  const trxSelesai = transactions.filter((t) => t.status_transaksi === "SELESAI").length;
  const trxTotalOmset = transactions
    .filter((t) => t.status_pembayaran === "LUNAS")
    .reduce((sum, t) => sum + Number(t.total_harga || 0), 0);

  const getStatusTrxBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "DISEWA":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "SELESAI":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "DIBATALKAN":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBayarBadge = (status: string) => {
    switch (status) {
      case "LUNAS":
        return "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold";
      case "BELUM_DIBAYAR":
        return "bg-rose-50 text-rose-700 border-rose-300 font-bold";
      case "MENUNGGU_VERIFIKASI":
        return "bg-sky-50 text-sky-700 border-sky-300 font-bold";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <span>Transaksi Penyewaan & Kasir</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengelolaan tagihan sewa pakaian adat, pencatatan kasir, invoice resmi, dan riwayat pelunasan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTransactions(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
            title="Segarkan Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-bayan-700 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <Link
            href="/dashboard/transaksi/baru"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-950/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-bayan-gold" />
            <span>+ Transaksi Sewa Baru</span>
          </Link>
        </div>
      </div>

      {/* Grid Kartu Ringkasan Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Total Transaksi
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {totalTrx}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Semua Riwayat</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Belum Dibayar
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
            {trxMenungguBayar}
          </span>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">Menunggu Kasir</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Sedang Disewa (Aktif)
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {trxAktif}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">Dibawa Pengunjung</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Pendapatan Lunas
          </span>
          <span className="text-lg sm:text-2xl font-extrabold text-bayan-800 font-mono">
            Rp{trxTotalOmset.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Kas Masuk Terverifikasi</span>
        </div>
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID Transaksi (TRX-...) atau ID Kunjungan (VST-...)..."
            className="w-full pl-10 pr-20 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-bayan-500 bg-slate-50/50 hover:bg-white focus:bg-white uppercase"
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3 rounded-lg bg-bayan-800 text-white text-[11px] font-bold hover:bg-bayan-700 transition-colors"
          >
            Cari
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Status Transaksi */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusTrxFilter}
              onChange={(e) => setStatusTrxFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-bayan-500"
            >
              <option value="ALL">Status: Semua</option>
              <option value="DRAFT">Status: DRAFT</option>
              <option value="DISEWA">Status: DISEWA (Aktif)</option>
              <option value="SELESAI">Status: SELESAI</option>
              <option value="DIBATALKAN">Status: DIBATALKAN</option>
            </select>
          </div>

          {/* Filter Status Pembayaran */}
          <select
            value={statusBayarFilter}
            onChange={(e) => setStatusBayarFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-bayan-500"
          >
            <option value="ALL">Bayar: Semua</option>
            <option value="BELUM_DIBAYAR">Belum Dibayar</option>
            <option value="LUNAS">Lunas</option>
            <option value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</option>
          </select>
        </div>
      </div>

      {/* Pesan Kesalahan */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabel Transaksi */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">ID Transaksi</th>
                <th className="py-3.5 px-4">Kunjungan Terkait</th>
                <th className="py-3.5 px-4">Tanggal (WITA)</th>
                <th className="py-3.5 px-4 text-center">Unit Sewa</th>
                <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                <th className="py-3.5 px-4 text-center">Status Transaksi</th>
                <th className="py-3.5 px-4 text-center">Status Bayar</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-bayan-700 mb-2" />
                    <span>Memuat data transaksi penyewaan...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Belum ada transaksi penyewaan</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Klik tombol "+ Transaksi Sewa Baru" untuk membuat pesanan sewa busana adat.
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((trx) => (
                  <tr key={trx.transaction_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID Transaksi */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <Link
                        href={`/dashboard/transaksi/${trx.transaction_id}`}
                        className="text-bayan-800 hover:text-bayan-600 hover:underline inline-flex items-center gap-1"
                      >
                        <span>{trx.transaction_id}</span>
                      </Link>
                    </td>

                    {/* ID Kunjungan */}
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold border border-slate-200">
                        {trx.visit_id}
                      </span>
                    </td>

                    {/* Tanggal WITA */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {trx.tanggal_transaksi || "-"}
                    </td>

                    {/* Total Barang */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-full bg-bayan-50 text-bayan-800 border border-bayan-200 font-mono">
                        {trx.total_barang} item
                      </span>
                    </td>

                    {/* Total Harga */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                      Rp{Number(trx.total_harga || 0).toLocaleString("id-ID")}
                    </td>

                    {/* Status Transaksi */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusTrxBadge(
                          trx.status_transaksi
                        )}`}
                      >
                        {trx.status_transaksi}
                      </span>
                    </td>

                    {/* Status Bayar */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] border ${getStatusBayarBadge(
                          trx.status_pembayaran
                        )}`}
                      >
                        {trx.status_pembayaran}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/transaksi/${trx.transaction_id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-bayan-700" />
                          <span>Invoice</span>
                        </Link>
                        {trx.status_pembayaran === "BELUM_DIBAYAR" && trx.status_transaksi !== "DIBATALKAN" && (
                          <Link
                            href={`/dashboard/transaksi/${trx.transaction_id}/bayar`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3 h-3 text-emerald-200" />
                            <span>Kasir</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Menampilkan {transactions.length} transaksi sewa terdaftar</span>
          <span className="font-medium text-slate-600">
            Kepatuhan Snapshot Pricing Aktif (Harga Sewa Terkunci Permanen)
          </span>
        </div>
      </div>
    </div>
  );
}
