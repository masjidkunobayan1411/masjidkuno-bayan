"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Printer,
  CreditCard,
  XCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Shirt,
  User,
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  Transaction,
  TransactionDetail,
  Payment,
  ReturnRecord,
  Visit,
  Visitor,
} from "@/types";

interface TransactionFullResponse {
  transaction: Transaction;
  details: TransactionDetail[];
  payments: Payment[];
  returns: ReturnRecord[];
  visit: Visit;
  visitor: Visitor;
}

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.transaction_id as string;

  const [data, setData] = useState<TransactionFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/transactions/${transactionId}`);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.message || "Data transaksi tidak ditemukan.");
      }
    } catch (err: any) {
      setError("Gagal memuat detail transaksi dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchDetail();
    }
  }, [transactionId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCancelTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);

    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan: cancelReason || "Dibatalkan oleh petugas kasir" }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || "Gagal membatalkan transaksi.");
        setCancelling(false);
        return;
      }

      setShowCancelModal(false);
      fetchDetail();
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-bayan-700 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Memuat lembar invoice transaksi...</p>
        <span className="text-xs text-slate-400 font-mono mt-1 block">{transactionId}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-slate-900">
          Transaksi Tidak Ditemukan
        </h2>
        <p className="text-xs text-slate-500">{error || "ID Transaksi tidak valid."}</p>
        <div className="pt-2">
          <Link
            href="/dashboard/transaksi"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bayan-800 text-white text-xs font-bold hover:bg-bayan-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Transaksi</span>
          </Link>
        </div>
      </div>
    );
  }

  const { transaction, details, payments, visit, visitor } = data;
  const isPaid = transaction.status_pembayaran === "LUNAS";
  const isCancelled = transaction.status_transaksi === "DIBATALKAN";

  // Helper memformat Waktu Masuk ke format jam WITA (menangani bug epoch 1899-12-30 dari spreadsheet)
  const formatWaktuWita = (timeVal?: string) => {
    if (!timeVal) return "-";
    const str = String(timeVal).trim();
    if (str.includes("1899-12-30") || (str.includes("T") && str.endsWith("Z"))) {
      try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Makassar",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
        }
      } catch {}
    }
    return str;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Bar Aksi Atas (Disembunyikan saat dicetak) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/transaksi"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Transaksi</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tombol Cetak */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-bayan-700" />
            <span>Cetak Invoice</span>
          </button>

          {/* Tombol Bayar Sekarang (jika belum lunas) */}
          {!isPaid && !isCancelled && (
            <Link
              href={`/dashboard/transaksi/${transaction.transaction_id}/bayar`}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all active:scale-95"
            >
              <CreditCard className="w-4 h-4 text-emerald-200" />
              <span>Bayar di Kasir</span>
            </Link>
          )}

          {/* Tombol Batalkan Transaksi */}
          {!isPaid && !isCancelled && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all"
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Batalkan</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LEMBAR INVOICE RESMI (SCREEN & PRINTABLE)                             */}
      {/* ==================================================================== */}
      <div
        id="printable-invoice"
        className="bg-white p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 space-y-6 sm:space-y-8"
      >
        {/* KOP RESMI INVOICE */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 pb-6 border-b-2 border-bayan-800">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-bayan-gold bg-bayan-900 px-2.5 py-1 rounded-md inline-block mb-1">
              Situs Cagar Budaya Nasional
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-slate-900 tracking-tight">
              MASJID KUNO BAYAN
            </h2>
            <p className="text-xs text-slate-500">
              Desa Bayan, Kecamatan Bayan, Kabupaten Lombok Utara, NTB
            </p>
            <p className="text-[11px] text-slate-400">
              Zona Operasional: WITA (UTC+8) • Pos Pelayanan Kunjungan & Busana Adat
            </p>
          </div>

          <div className="sm:text-right space-y-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span className="text-xs font-extrabold font-serif text-bayan-800 uppercase tracking-wider block">
              INVOICE PENYEWAAN PAKAIAN ADAT
            </span>
            <div className="font-mono text-base font-extrabold text-slate-900">
              {transaction.transaction_id}
            </div>
            <div className="text-[11px] text-slate-500">
              Tanggal: <strong>{transaction.tanggal_transaksi}</strong>
            </div>
            <div className="text-[11px] text-slate-500">
              Kasir/Admin: <strong>{transaction.nama_petugas || transaction.petugas_id || "ADMIN"}</strong>
            </div>
          </div>
        </div>

        {/* STATUS BADGE BANNER */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-slate-600">Status Bayar:</span>
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>LUNAS</span>
              </span>
            ) : isCancelled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>DIBATALKAN</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>BELUM DIBAYAR</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-slate-600">Status Transaksi:</span>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800">
              {transaction.status_transaksi}
            </span>
          </div>
        </div>

        {/* DATA PENGUNJUNG & KUNJUNGAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border border-slate-200 text-xs">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Data Pengunjung
            </span>
            <div className="font-bold text-slate-900 text-sm">
              {visitor?.nama_pengunjung || "Nama Pengunjung"}
            </div>
            <div className="text-slate-600">
              Kategori: <strong>{visitor?.jenis_pengunjung || "DOMESTIK"}</strong>
            </div>
            <div className="text-slate-600">
              Asal: {visitor?.kabupaten_kota ? `${visitor.kabupaten_kota}, ${visitor.provinsi}` : visitor?.negara || "-"}
            </div>
            <div className="text-slate-600">
              Kontak: {visitor?.nomor_telepon || "-"}
            </div>
          </div>

          <div className="space-y-1.5 md:border-l md:pl-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 md:border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Sesi Kunjungan
            </span>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {visit?.visit_id || transaction.visit_id}
            </div>
            <div className="text-slate-600">
              Total Rombongan: <strong>{visit?.total_pengunjung || 1} Orang</strong> ({visit?.jumlah_dewasa || 1} Dewasa, {visit?.jumlah_anak || 0} Anak)
            </div>
            <div className="text-slate-600">
              Tujuan: {visit?.tujuan_kunjungan || "Wisata Budaya & Religi"}
            </div>
            <div className="text-slate-600">
              Waktu Masuk: <strong>{formatWaktuWita(visit?.waktu_kunjungan)} WITA</strong>
            </div>
          </div>
        </div>

        {/* RINCIAN BARANG SEWA (SNAPSHOT HARGA) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-slate-900">
              Rincian Pakaian Adat yang Disewa
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Total: {details?.length || transaction.total_barang} Unit
            </span>
          </div>

          {/* TAMPILAN MOBILE: KARTU RESPONSIF KHUSUS HP (Screen < md) */}
          <div className="block md:hidden space-y-3">
            {details && details.length > 0 ? (
              details.map((item, idx) => (
                <div
                  key={item.detail_id || idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">
                        {item.nama_produk_snapshot}
                      </h4>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-blue-900">
                      Rp{Number(item.subtotal).toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-slate-200/70">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-[10px] text-slate-400 uppercase">Barcode:</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800">
                        {item.inventory_id}
                      </span>
                    </div>
                    <div className="text-slate-500 font-medium">
                      {item.jumlah} Unit × Rp{Number(item.harga_snapshot).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                Rincian barang sewa terdaftar: {transaction.total_barang} item.
              </div>
            )}

            {/* Banner Total Tagihan Mobile */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Total Tagihan Sewa:
              </span>
              <span className="text-base font-extrabold font-mono text-blue-900">
                Rp{Number(transaction.total_harga || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* TAMPILAN DESKTOP & CETAK (TABEL RESMI HORIZONTAL) */}
          <div className="hidden md:block print:block border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[550px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-10 text-center">No</th>
                  <th className="py-2.5 px-4">Nama Busana Adat</th>
                  <th className="py-2.5 px-4 font-mono">Kode Unit (Barcode)</th>
                  <th className="py-2.5 px-4 text-center">Jumlah</th>
                  <th className="py-2.5 px-4 text-right">Tarif Sewa (Snapshot)</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details && details.length > 0 ? (
                  details.map((item, idx) => (
                    <tr key={item.detail_id || idx}>
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.nama_produk_snapshot}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {item.inventory_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {item.jumlah}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        Rp{Number(item.harga_snapshot).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        Rp{Number(item.subtotal).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      Rincian barang sewa terdaftar: {transaction.total_barang} item.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <td colSpan={5} className="py-3.5 px-4 text-right text-slate-700 uppercase tracking-wider">
                    Total Tagihan Sewa:
                  </td>
                  <td className="py-3.5 px-4 text-right text-bayan-900 font-mono text-base font-extrabold">
                    Rp{Number(transaction.total_harga || 0).toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* HISTORI PEMBAYARAN (JIKA ADA) */}
        {payments && payments.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-sm text-slate-900">
              Riwayat Transaksi Pembayaran
            </h3>

            {/* Histori Pembayaran Mobile Cards */}
            <div className="block md:hidden space-y-2.5">
              {payments.map((p) => (
                <div key={p.payment_id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{p.metode_pembayaran}</span>
                    <span className="font-bold font-mono text-emerald-700">
                      Rp{Number(p.jumlah_bayar).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Waktu: {formatWaktuWita(p.waktu_pembayaran)} WITA</span>
                    <span>Ref: {p.referensi_gateway || "-"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Histori Pembayaran Desktop Table */}
            <div className="hidden md:block print:block border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[550px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Waktu (WITA)</th>
                    <th className="py-2.5 px-4">Metode</th>
                    <th className="py-2.5 px-4">Referensi Gateway</th>
                    <th className="py-2.5 px-4">Diverifikasi Oleh</th>
                    <th className="py-2.5 px-4 text-right">Jumlah Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td className="py-2.5 px-4 text-slate-600">{formatWaktuWita(p.waktu_pembayaran)}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {p.metode_pembayaran}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{p.referensi_gateway}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.diverifikasi_oleh}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                        Rp{Number(p.jumlah_bayar).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TATA TERTIB & TANDA TANGAN */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-[11px] text-slate-500">
          <div className="space-y-1">
            <span className="font-bold text-slate-800 block">Ketentuan Sewa Pakaian Adat:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>Pakaian adat wajib dijaga kebersihan dan kelengkapannya selama berada di kawasan adat.</li>
              <li>Unit wajib dikembalikan ke Pos Petugas sebelum pukul 17.00 WITA.</li>
              <li>Segala bentuk kerusakan robek atau kehilangan akan dikenakan biaya perbaikan/penggantian.</li>
            </ul>
          </div>

          <div className="flex flex-col items-center sm:items-end justify-center text-center sm:text-right">
            <span className="text-slate-400 block mb-12">Petugas Kasir Pengelola</span>
            <div className="border-t border-slate-300 pt-1 min-w-[180px] text-center">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                {transaction.nama_petugas || "PETUGAS BAYAN"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL KONFIRMASI PEMBATALAN TRANSAKSI                                */}
      {/* ==================================================================== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="bg-rose-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-rose-300" />
                <h3 className="font-serif font-bold text-base">Batalkan Transaksi Sewa</h3>
              </div>
            </div>

            <form onSubmit={handleCancelTransaction} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Apakah Anda yakin ingin membatalkan transaksi <strong>{transaction.transaction_id}</strong>?
                Seluruh unit busana adat akan otomatis dikembalikan ke status <strong>TERSEDIA</strong>.
              </p>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Alasan Pembatalan *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Pengunjung batal sewa / salah input unit..."
                  required
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/20"
                >
                  {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Ya, Batalkan Transaksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
