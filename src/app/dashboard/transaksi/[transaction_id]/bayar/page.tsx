"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  FileText,
  Clock,
  ShieldCheck,
  Receipt,
  User,
  Shirt,
  Loader2,
  Check,
  Info,
} from "lucide-react";
import { Transaction, TransactionDetail, Visit, Visitor } from "@/types";

interface TransactionFullData {
  transaction: Transaction;
  details: TransactionDetail[];
  visit: Visit;
  visitor: Visitor;
}

interface PaymentReceipt {
  payment_id: string;
  transaction_id: string;
  metode: string;
  total_harga: number;
  jumlah_bayar: number;
  kembalian: number;
  referensi_gateway: string;
  waktu_pembayaran: string;
  petugas: string;
}

export default function KasirPembayaranPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.transaction_id as string;

  const [data, setData] = useState<TransactionFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Payment Tabs
  const [activeTab, setActiveTab] = useState<"CASH" | "QRIS">("CASH");

  // Cash Form State
  const [cashAmount, setCashAmount] = useState<number | "">("");
  const [processingCash, setProcessingCash] = useState(false);
  const [cashError, setCashError] = useState("");

  // QRIS Form State
  const [qrisVariant, setQrisVariant] = useState<"QRIS BAYANNESIA" | "QRIS BUMDES BAYAN">("QRIS BAYANNESIA");
  const [qrisDataUrl, setQrisDataUrl] = useState("");
  const [qrisInitiated, setQrisInitiated] = useState(false);
  const [processingQris, setProcessingQris] = useState(false);
  const [qrisError, setQrisError] = useState("");
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Success Receipt State
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  // 1. Muat Detail Transaksi
  const fetchTransactionDetail = async () => {
    setLoading(true);
    setPageError("");
    try {
      const res = await fetch(`/api/transactions/${transactionId}`);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setData(json.data);
        const trx = json.data.transaction;

        // Jika transaksi sudah lunas
        if (trx.status_pembayaran === "LUNAS") {
          setPageError("Transaksi ini sudah berstatus LUNAS sebelumnya.");
        } else {
          // Set default cash amount
          setCashAmount(Number(trx.total_harga || 0));

          // Deteksi otomatis busana yang disewa (Kain Poleng vs Kain Batik)
          const details = json.data.details || [];
          const polengCount = details.filter((d: any) =>
            String(d.nama_produk_snapshot || "").toLowerCase().includes("poleng")
          ).length;
          const batikCount = details.filter((d: any) =>
            String(d.nama_produk_snapshot || "").toLowerCase().includes("batik")
          ).length;

          if (batikCount > 0 && polengCount === 0) {
            setQrisVariant("QRIS BUMDES BAYAN");
          } else {
            setQrisVariant("QRIS BAYANNESIA");
          }
        }
      } else {
        setPageError(json.message || "Data transaksi tidak ditemukan.");
      }
    } catch (err: any) {
      setPageError("Gagal menghubungi server untuk memuat transaksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetail();
    }
  }, [transactionId]);

  // Generate QRIS QR Code saat tab QRIS dipilih
  useEffect(() => {
    if (activeTab === "QRIS" && data?.transaction) {
      const trx = data.transaction;
      const qrisString = `BAYAN-QRIS:MASJID_KUNO_BAYAN|TRX:${trx.transaction_id}|AMOUNT:${trx.total_harga}|CURR:IDR|MERCHANT:KASIR_BAYAN`;
      QRCode.toDataURL(qrisString, {
        width: 250,
        margin: 2,
        color: {
          dark: "#1c2b21", // bayan-900
          light: "#ffffff",
        },
      })
        .then((url) => setQrisDataUrl(url))
        .catch((err) => console.error("Gagal generate QR Code QRIS:", err));
    }
  }, [activeTab, data]);

  // Handler Submit Pembayaran Tunai
  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashError("");

    if (!data?.transaction) return;

    const totalTagihan = Number(data.transaction.total_harga || 0);
    const bayar = Number(cashAmount);

    if (isNaN(bayar) || bayar < totalTagihan) {
      setCashError(
        `Nominal uang diterima kurang dari total tagihan (Rp${totalTagihan.toLocaleString("id-ID")}).`
      );
      return;
    }

    setProcessingCash(true);

    try {
      const res = await fetch("/api/payments/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          jumlah_bayar: bayar,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setCashError(json.message || "Gagal memproses pembayaran tunai.");
        setProcessingCash(false);
        return;
      }

      const pData = json.data;
      setReceipt({
        payment_id: pData.payment?.payment_id || "PAY-CASH",
        transaction_id: transactionId,
        metode: "TUNAI (Cash)",
        total_harga: totalTagihan,
        jumlah_bayar: bayar,
        kembalian: pData.kembalian || bayar - totalTagihan,
        referensi_gateway: pData.payment?.referensi_gateway || "CASH-PAID",
        waktu_pembayaran: new Date().toLocaleTimeString("id-ID"),
        petugas: pData.payment?.diverifikasi_oleh || "PETUGAS",
      });
    } catch (err: any) {
      setCashError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setProcessingCash(false);
    }
  };

  // Handler Inisiasi QRIS (Otomatis di Background)
  const handleInitiateQris = async (variant = qrisVariant) => {
    try {
      const res = await fetch("/api/payments/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          transaction_id: transactionId,
          metode_pembayaran: variant,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setQrisInitiated(true);
      }
    } catch (err) {
      console.warn("[QRIS AUTO-INITIATE]", err);
    }
  };

  // Otomatis inisiasi tagihan QRIS saat kasir membuka tab QRIS atau mengganti varian
  useEffect(() => {
    if (activeTab === "QRIS" && data?.transaction && data.transaction.status_pembayaran !== "LUNAS") {
      handleInitiateQris(qrisVariant);
    }
  }, [activeTab, qrisVariant, data]);

  // Handler Konfirmasi Pelunasan QRIS (Langsung Lanjutkan Tanpa RRN)
  const handleVerifyQris = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQrisError("");
    setProcessingQris(true);

    try {
      const res = await fetch("/api/payments/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          transaction_id: transactionId,
          metode_pembayaran: qrisVariant,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setQrisError(json.message || "Verifikasi QRIS gagal.");
        setProcessingQris(false);
        return;
      }

      const totalTagihan = Number(data?.transaction?.total_harga || 0);
      const generatedRef =
        json.data?.referensi_gateway ||
        `QRIS-${Date.now().toString(36).toUpperCase()}`;

      setReceipt({
        payment_id: json.data?.payment_id || "PAY-QRIS",
        transaction_id: transactionId,
        metode:
          qrisVariant === "QRIS BAYANNESIA"
            ? "Payment QRIS BAYANNESIA (Kain Poleng)"
            : "Payment QRIS BUMDES BAYAN (Kain Batik)",
        total_harga: totalTagihan,
        jumlah_bayar: totalTagihan,
        kembalian: 0,
        referensi_gateway: generatedRef,
        waktu_pembayaran: new Date().toLocaleTimeString("id-ID"),
        petugas: "KASIR_QRIS",
      });
    } catch (err) {
      setQrisError("Gagal memverifikasi transaksi QRIS ke server.");
    } finally {
      setProcessingQris(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-bayan-700 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Mempersiapkan kasir pembayaran...</p>
        <span className="text-xs text-slate-400 font-mono mt-1 block">{transactionId}</span>
      </div>
    );
  }

  const trx = data?.transaction;
  const totalTagihan = Number(trx?.total_harga || 0);
  const currentCash = Number(cashAmount || 0);
  const kembalian = currentCash - totalTagihan;

  // Hitung jumlah item pakaian adat yang disewa
  const polengUnits =
    data?.details?.filter((d) =>
      String(d.nama_produk_snapshot || "").toLowerCase().includes("poleng")
    ).length || 0;
  const batikUnits =
    data?.details?.filter((d) =>
      String(d.nama_produk_snapshot || "").toLowerCase().includes("batik")
    ).length || 0;

  // Preset Pecahan Tunai Cepat
  const quickCashPresets = [
    { label: "Uang Pas", value: totalTagihan },
    { label: "Rp20.000", value: 20000 },
    { label: "Rp50.000", value: 50000 },
    { label: "Rp100.000", value: 100000 },
    { label: "Rp200.000", value: 200000 },
  ].filter((p) => p.value >= totalTagihan);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Breadcrumb Navigasi */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/transaksi/${transactionId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Lembar Invoice</span>
        </Link>
        <span className="text-xs font-mono font-bold text-slate-400">{transactionId}</span>
      </div>

      {/* Pesan Kesalahan Global */}
      {pageError && !receipt && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold">{pageError}</span>
          </div>
          <Link
            href={`/dashboard/transaksi/${transactionId}`}
            className="px-3 py-1 rounded-lg bg-amber-200 text-amber-900 font-bold hover:bg-amber-300 transition-colors"
          >
            Buka Invoice
          </Link>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STRUK / BUKTI PELUNASAN SETELAH PEMBAYARAN SUKSES                    */}
      {/* ==================================================================== */}
      {receipt ? (
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 animate-scaleIn">
          <div className="text-center pb-6 border-b border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h2 className="text-xl font-serif font-bold text-slate-900">
              Pembayaran Berhasil Diverifikasi
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Transaksi telah berstatus <strong className="text-emerald-700">LUNAS</strong> dan unit inventaris resmi <strong className="text-bayan-900">DISEWA</strong>.
            </p>
          </div>

          {/* Rincian Struk */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Nomor Invoice:</span>
              <strong className="text-slate-900">{receipt.transaction_id}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Metode Pembayaran:</span>
              <strong className="text-slate-900">{receipt.metode}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Waktu Pembayaran (WITA):</span>
              <span className="text-slate-900">{receipt.waktu_pembayaran}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Referensi Gateway/Nota:</span>
              <span className="text-slate-700">{receipt.referensi_gateway}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-800 font-bold text-sm">
              <span>Total Tagihan:</span>
              <span>Rp{receipt.total_harga.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Jumlah Diterima:</span>
              <span>Rp{receipt.jumlah_bayar.toLocaleString("id-ID")}</span>
            </div>
            {receipt.kembalian > 0 && (
              <div className="flex justify-between text-bayan-800 font-extrabold text-sm pt-1 border-t border-dashed border-slate-300">
                <span>UANG KEMBALIAN:</span>
                <span>Rp{receipt.kembalian.toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>

          {/* Aksi Pasca Bayar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-bayan-700" />
              <span>Cetak Bukti Pembayaran</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href={`/dashboard/transaksi/${transactionId}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-950/20 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-bayan-gold" />
                <span>Buka Invoice Resmi</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* MODUL KASIR PEMBAYARAN AKTIF                                         */
        /* ==================================================================== */
        <div className="space-y-6">
          {/* Hero Ringkasan Tagihan */}
          <div className="bg-bayan-900 text-white p-6 sm:p-8 rounded-3xl shadow-md border border-bayan-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-bayan-gold block mb-1">
                Total Tagihan Kasir
              </span>
              <div className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
                Rp{totalTagihan.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-bayan-200 mt-2">
                {data?.visitor?.nama_pengunjung || "Pengunjung"} • Sesi{" "}
                <span className="font-mono">{trx?.visit_id}</span>
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-bayan-800">
              <span className="text-[10px] text-bayan-300 uppercase tracking-wider block">
                Jumlah Busana Adat
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {trx?.total_barang || 1} Unit
              </span>
              <span className="text-[11px] text-bayan-300 block mt-0.5">
                Status: <strong className="text-amber-400">{trx?.status_pembayaran}</strong>
              </span>
            </div>
          </div>

          {/* Tab Pilihan Metode Pembayaran */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("CASH")}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "CASH"
                  ? "bg-bayan-800 text-white shadow-sm"
                  : "bg-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Banknote className="w-4 h-4 text-bayan-gold" />
              <span>TUNAI (Cash)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("QRIS")}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "QRIS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>QRIS (Bayannesia &amp; BUMDes)</span>
            </button>
          </div>

          {/* ================================================================ */}
          {/* PANEL METODE 1: TUNAI (CASH)                                     */}
          {/* ================================================================ */}
          {activeTab === "CASH" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm pb-3 border-b border-slate-100">
                <Banknote className="w-5 h-5 text-bayan-700" />
                <span>Pelunasan Tunai (Cash di Pos)</span>
              </div>

              {cashError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{cashError}</span>
                </div>
              )}

              <form onSubmit={handleCashSubmit} className="space-y-5">
                {/* Input Uang Diterima */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nominal Uang Diterima dari Pengunjung (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 font-bold font-mono text-sm">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={totalTagihan}
                      value={cashAmount}
                      onChange={(e) =>
                        setCashAmount(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder={totalTagihan.toString()}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 text-lg font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-bayan-500 bg-slate-50/50 hover:bg-white focus:bg-white"
                    />
                  </div>
                </div>

                {/* Preset Pecahan Cepat */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Pecahan Uang Tunai Cepat:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {quickCashPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashAmount(preset.value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                          cashAmount === preset.value
                            ? "bg-bayan-800 text-white border-bayan-800"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Komputasi Kembalian Real-Time */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Status Perhitungan Kasir:
                    </span>
                    {kembalian < 0 ? (
                      <span className="text-xs font-bold text-rose-600 mt-1 block">
                        Uang kurang Rp{Math.abs(kembalian).toLocaleString("id-ID")}
                      </span>
                    ) : kembalian === 0 ? (
                      <span className="text-xs font-bold text-emerald-700 mt-1 block">
                        Uang Pas (Tidak ada kembalian)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 mt-1 block">
                        Kembalian Siap Diserahkan
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Uang Kembalian (Rp)
                    </span>
                    <span
                      className={`text-2xl font-mono font-extrabold ${
                        kembalian >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      Rp{Math.max(0, kembalian).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Tombol Eksekusi Pembayaran Tunai */}
                <button
                  type="submit"
                  disabled={processingCash || kembalian < 0}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-950/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                >
                  {processingCash && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>
                    Konfirmasi Pelunasan Tunai (Rp{Number(cashAmount || 0).toLocaleString("id-ID")})
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* ================================================================ */}
          {/* PANEL METODE 2: QRIS DANA (BAYANNESIA vs BUMDES BAYAN)            */}
          {/* ================================================================ */}
          {activeTab === "QRIS" && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-serif font-bold text-sm">
                  <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Pembayaran Nontunai QRIS Resmi</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 w-fit">
                  <span>DANA Bisnis • Multi Merchant</span>
                </div>
              </div>

              {/* Pemilihan Merchant QRIS Sesuai Jenis Busana Adat */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Pilih Merchant QRIS Sesuai Kain yang Disewa:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tombol 1: Payment QRIS BAYANNESIA (Kain Poleng) */}
                  <button
                    type="button"
                    onClick={() => setQrisVariant("QRIS BAYANNESIA")}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      qrisVariant === "QRIS BAYANNESIA"
                        ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Payment QRIS BAYANNESIA
                        </span>
                        {polengUnits > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                            {polengUnits} Kain Poleng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Khusus pembayaran sewa <strong>Kain Poleng</strong> (Kelolaan Bayannesia).
                      </p>
                    </div>
                    {qrisVariant === "QRIS BAYANNESIA" && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Barcode Aktif
                      </span>
                    )}
                  </button>

                  {/* Tombol 2: Payment QRIS BUMDES BAYAN (Kain Batik) */}
                  <button
                    type="button"
                    onClick={() => setQrisVariant("QRIS BUMDES BAYAN")}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      qrisVariant === "QRIS BUMDES BAYAN"
                        ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-amber-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Payment QRIS BUMDES BAYAN
                        </span>
                        {batikUnits > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-bold">
                            {batikUnits} Kain Batik
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Khusus pembayaran sewa <strong>Kain Batik</strong> (Kelolaan BUMDes Bayan).
                      </p>
                    </div>
                    {qrisVariant === "QRIS BUMDES BAYAN" && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Barcode Aktif
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Petunjuk Konfirmasi Kasir */}
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-300 text-xs flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Penyelesaian Transaksi QRIS:</span>
                  <p className="text-sky-800 dark:text-sky-400 text-[11px] leading-relaxed">
                    Setelah penyewa menyelesaikan pembayaran dengan scan barcode {qrisVariant} dan menunjukkan bukti bayar, klik tombol <strong>Lanjutkan (Pembayaran Diterima)</strong> di bawah.
                  </p>
                </div>
              </div>

              {/* Info Folder Kustom Barcode Aktif */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    Barcode aktif: <strong>{qrisVariant === "QRIS BAYANNESIA" ? "Payment QRIS BAYANNESIA" : "Payment QRIS BUMDES BAYAN"}</strong> (
                    <code className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      public/media/qris/{qrisVariant === "QRIS BAYANNESIA" ? "qris-bayannesia.jpg" : "qris-bumdes.jpg"}
                    </code>)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs border border-slate-200 dark:border-slate-600 shadow-xs transition-all cursor-pointer"
                >
                  <span>🔍 Perbesar QRIS</span>
                </button>
              </div>

              {qrisError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{qrisError}</span>
                </div>
              )}

              {/* Tampilan Barcode QR Code QRIS Terpilih */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-slate-200 dark:border-slate-700 text-center max-w-[280px] w-full">
                  <div className="relative group cursor-pointer" onClick={() => setZoomModalOpen(true)}>
                    <img
                      src={`/api/media/custom/${qrisVariant === "QRIS BAYANNESIA" ? "qris-bayannesia" : "qris-bumdes"}`}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.src =
                          qrisVariant === "QRIS BAYANNESIA"
                            ? "/media/qris/qris-bayannesia.jpg"
                            : "/media/qris/qris-bumdes.jpg";
                      }}
                      alt={qrisVariant}
                      className="w-full h-auto max-h-[300px] object-contain mx-auto rounded-xl shadow-xs group-hover:scale-102 transition-transform"
                    />
                    <div className="absolute inset-0 bg-blue-900/10 group-hover:bg-blue-900/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-xs font-bold shadow-md">
                        Klik untuk Perbesar
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase mt-2.5 block">
                    {qrisVariant === "QRIS BAYANNESIA" ? "QRIS BAYANNESIA (POLENG)" : "QRIS BUMDES BAYAN (BATIK)"}
                  </span>
                </div>

                <div className="space-y-4 text-center sm:text-left max-w-sm">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Nominal Tagihan:
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 justify-center sm:justify-start">
                      <span className="text-3xl font-mono font-extrabold text-blue-600 dark:text-blue-400">
                        Rp{totalTagihan.toLocaleString("id-ID")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(totalTagihan.toString());
                          setCopiedAmount(true);
                          setTimeout(() => setCopiedAmount(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors"
                        title="Salin nominal tagihan"
                      >
                        {copiedAmount ? "Tersalin!" : "Salin"}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 text-left">
                    <span className="font-bold text-slate-800 dark:text-white block">
                      Panduan Bayar Pengunjung:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <li>Buka aplikasi <strong>DANA</strong> atau mobile banking/e-wallet apapun.</li>
                      <li>Scan barcode <strong>{qrisVariant}</strong> di samping.</li>
                      <li>Masukkan nominal pas: <strong>Rp{totalTagihan.toLocaleString("id-ID")}</strong>.</li>
                      <li>Konfirmasi pembayaran dan tunjukkan bukti transfer ke kasir.</li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-[11px] text-slate-500">Status Gateway:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-bold border border-sky-300 dark:border-sky-800">
                      MENUNGGU_VERIFIKASI
                    </span>
                  </div>
                </div>
              </div>

              {/* Tombol Lanjutkan Tanpa RRN */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={() => handleVerifyQris()}
                  disabled={processingQris}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  {processingQris ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Menyelesaikan Transaksi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      <span>Lanjutkan (Pembayaran Diterima)</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                  Pastikan penyewa telah menunjukkan bukti transfer berhasil sebesar <strong>Rp{totalTagihan.toLocaleString("id-ID")}</strong> sebelum menekan tombol Lanjutkan.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL ZOOM QRIS DANA FULL RESOLUTION */}
      {zoomModalOpen && (
        <div
          onClick={() => setZoomModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="text-left">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Pindai Pembayaran Nontunai
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                  {qrisVariant === "QRIS BAYANNESIA" ? "Payment QRIS BAYANNESIA (Kain Poleng)" : "Payment QRIS BUMDES BAYAN (Kain Batik)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZoomModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-inner">
              <img
                src={`/api/media/custom/${qrisVariant === "QRIS BAYANNESIA" ? "qris-bayannesia" : "qris-bumdes"}`}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src =
                    qrisVariant === "QRIS BAYANNESIA"
                      ? "/media/qris/qris-bayannesia.jpg"
                      : "/media/qris/qris-bumdes.jpg";
                }}
                alt={qrisVariant}
                className="w-full max-h-[460px] object-contain mx-auto rounded-lg"
              />
            </div>

            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300">
              <span>Nominal Pas Tagihan: </span>
              <strong className="font-mono text-sm font-extrabold text-blue-700 dark:text-blue-400">
                Rp{totalTagihan.toLocaleString("id-ID")}
              </strong>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak QRIS Standee</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
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
