"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Landmark,
  ArrowLeft,
  Printer,
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Shirt,
  Share2,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface TicketData {
  visit_id: string;
  visitor_id: string;
  nama_pengunjung: string;
  jenis_pengunjung: string;
  asal?: string;
  nomor_telepon?: string;
  asal_instansi?: string;
  tanggal_kunjungan: string;
  waktu_kunjungan: string;
  jumlah_dewasa: number;
  jumlah_anak: number;
  total_pengunjung: number;
  tujuan_kunjungan: string;
  status_kunjungan: string;
  dibuat_pada: string;
  visitor?: {
    nama_pengunjung?: string;
    jenis_pengunjung?: string;
    negara?: string;
    provinsi?: string;
    kabupaten_kota?: string;
    nomor_telepon?: string;
    asal_instansi?: string;
  };
}

export default function TiketPage({ params }: { params: { visit_id: string } }) {
  const { visit_id } = params;
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // 1. Generate QR Code
    if (visit_id) {
      QRCode.toDataURL(visit_id, {
        width: 250,
        margin: 2,
        color: {
          dark: "#1b4332", // Bayan dark green
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("Gagal generate QR Code:", err));
    }

    // 2. Fetch Detail Tiket dari API
    const fetchTicket = async () => {
      try {
        const res = await fetch(`/api/public/ticket/${visit_id}`);
        const json = await res.json();

        if (res.ok && json.success && json.data) {
          setTicket(json.data);
        } else {
          // Fallback lokal jika data belum tersinkron
          setTicket({
            visit_id: visit_id,
            visitor_id: "VISITOR",
            nama_pengunjung: "Pengunjung Terdaftar",
            jenis_pengunjung: "DOMESTIK",
            tanggal_kunjungan: new Date().toISOString().split("T")[0],
            waktu_kunjungan: "WITA",
            jumlah_dewasa: 1,
            jumlah_anak: 0,
            total_pengunjung: 1,
            tujuan_kunjungan: "Wisata Budaya",
            status_kunjungan: "TERDAFTAR",
            dibuat_pada: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        setErrorMessage("Tidak dapat memuat rincian tiket secara daring.");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [visit_id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `E-Tiket Kunjungan Masjid Kuno Bayan [${visit_id}]`,
          text: `Bukti Pendaftaran Kunjungan Masjid Kuno Bayan untuk ${ticket?.nama_pengunjung || "Pengunjung"} (${visit_id})`,
          url: window.location.href,
        });
      } catch (e) {
        // Abaikan pembatalan share
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Tautan tiket berhasil disalin ke clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-bayan-800">
          <Loader2 className="w-8 h-8 animate-spin text-bayan-700" />
          <p className="text-sm font-semibold">Memuat E-Tiket Kunjungan...</p>
        </div>
      </div>
    );
  }

  const asalWilayah =
    ticket?.asal ||
    (ticket?.visitor
      ? ticket.visitor.jenis_pengunjung === "DOMESTIK"
        ? `${ticket.visitor.kabupaten_kota}, ${ticket.visitor.provinsi}`
        : ticket.visitor.negara
      : "Indonesia");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 text-slate-800 dark:text-slate-100 flex flex-col py-6 sm:py-10 px-4 transition-colors">
      {/* Tombol Navigasi & Aksi (Disembunyikan saat Print) */}
      <div className="max-w-xl mx-auto w-full mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-all"
            title="Bagikan Tautan Tiket"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan Tiket</span>
          </button>
        </div>
      </div>

      {/* Kartu E-Tiket Digital */}
      <div className="max-w-xl mx-auto w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/80 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header Tiket */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-amber-400/15 blur-xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-800 border border-blue-600 flex items-center justify-center p-2 shadow-md overflow-hidden">
                <img
                  src="/media/logo/logo.png"
                  onError={(e) => {
                    e.currentTarget.src = "/media/logo/logo.svg";
                  }}
                  alt="Logo Bayan"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-serif font-bold text-lg sm:text-xl block tracking-tight">
                  MASJID KUNO BAYAN
                </span>
                <span className="text-[11px] text-blue-200 block font-medium">
                  Situs Cagar Budaya • Lombok Utara, NTB
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                E-TIKET RESMI
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-bayan-700/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-bayan-300 block text-[10px] uppercase font-bold tracking-wider">
                ID Kunjungan (Visit ID)
              </span>
              <span className="font-mono font-bold text-base text-bayan-gold">
                {ticket?.visit_id}
              </span>
            </div>
            <div className="text-right">
              <span className="text-bayan-300 block text-[10px] uppercase font-bold tracking-wider">
                Status
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{ticket?.status_kunjungan || "TERDAFTAR"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Garis Potong Dekoratif (Ticket Punch Effect) */}
        <div className="relative bg-slate-100 dark:bg-slate-800 h-4 flex items-center justify-between px-2 overflow-hidden">
          <div className="w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-950 -ml-4" />
          <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700 mx-2" />
          <div className="w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-950 -mr-4" />
        </div>

        {/* Badan Tiket & QR Code */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Tampilan QR Code */}
          <div className="text-center bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            {qrCodeUrl ? (
              <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${ticket?.visit_id}`}
                  className="w-44 h-44 sm:w-48 sm:h-48 mx-auto"
                />
              </div>
            ) : (
              <div className="w-44 h-44 mx-auto bg-slate-200 dark:bg-slate-700 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-500">
                Membuat QR Code...
              </div>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 font-medium">
              Perlihatkan kode QR ini kepada petugas di pintu masuk Masjid Kuno Bayan
            </p>
          </div>

          {/* Rincian Kunjungan */}
          <div className="space-y-3.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Nama Perwakilan:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right">
                {ticket?.nama_pengunjung || ticket?.visitor?.nama_pengunjung}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Asal Daerah / Negara:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right">
                {asalWilayah}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Instansi / Komunitas:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right">
                {ticket?.asal_instansi || ticket?.visitor?.asal_instansi || "Umum"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Jumlah Rombongan:</span>
              <div className="text-right">
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                  {ticket?.total_pengunjung} Orang
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  ({ticket?.jumlah_dewasa} Dewasa, {ticket?.jumlah_anak || 0} Anak)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tujuan Kunjungan:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right">
                {ticket?.tujuan_kunjungan}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Kunjungan:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right">
                {ticket?.tanggal_kunjungan} • {ticket?.waktu_kunjungan} WITA
              </span>
            </div>
          </div>

          {/* Pengingat Adat & Penyewaan Pakaian */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
              <Shirt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Ketentuan Busana Adat Masjid Kuno Bayan</span>
            </div>
            <p className="leading-relaxed text-blue-800 dark:text-blue-300">
              Pengunjung wajib mengenakan pakaian adat (Kain Poleng / Dodot Sasak). Bila belum membawa sendiri, layanan sewa busana bersih tersedia di pos pengelola (mulai Rp 10.000 – Rp 20.000).
            </p>
          </div>
        </div>

        {/* Footer Tiket */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <span>Kawasan Cagar Budaya Nasional • Jam Operasional: 08:00 - 17:00 WITA</span>
        </div>
      </div>

      {/* Catatan bawah */}
      <div className="max-w-xl mx-auto w-full mt-6 text-center text-xs text-slate-500 print:hidden">
        Simpan halaman ini atau ambil tangkapan layar (screenshot) sebagai bukti pendaftaran resmi Anda.
      </div>
    </div>
  );
}
