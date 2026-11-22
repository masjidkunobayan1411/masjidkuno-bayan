import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  ShieldCheck,
  User,
  LogOut,
  Clock,
  Sparkles,
  Users,
  Shirt,
  Receipt,
  FileBarChart,
  Settings,
  PlusCircle,
  RotateCcw,
  PackageCheck,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import DashboardMetricsView from "@/components/dashboard/DashboardMetricsView";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-bayan-900 via-bayan-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-bayan-950/10 border border-bayan-700/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-bayan-950/70 text-bayan-gold text-xs font-semibold mb-4 border border-bayan-gold/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sesi Terotentikasi Aman</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Selamat Datang, {user.nama}
          </h1>

          <p className="text-bayan-100 text-sm mt-2 max-w-2xl leading-relaxed font-light">
            Anda terhubung ke sistem administrasi digital Masjid Kuno Bayan sebagai{" "}
            <span className="font-bold text-bayan-gold uppercase tracking-wider px-2 py-0.5 rounded bg-bayan-gold/20 border border-bayan-gold/30">
              {user.role}
            </span>
            . Pantau kunjungan, kelola penyewaan pakaian adat, dan lakukan pencatatan operasional harian.
          </p>

          {/* Quick Action Buttons (Pintasan Tindakan Cepat) */}
          <div className="mt-6 pt-6 border-t border-bayan-700/60 flex flex-wrap gap-3">
            <Link
              href="/registrasi"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bayan-gold text-bayan-950 text-xs font-bold uppercase tracking-wider shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Pendaftaran Baru di Tempat</span>
            </Link>

            <Link
              href="/dashboard/transaksi"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-semibold border border-bayan-600 transition-all shadow-sm"
            >
              <Receipt className="w-4 h-4 text-bayan-gold" />
              <span>Sewa Pakaian Adat Baru</span>
            </Link>

            <Link
              href="/dashboard/pengembalian"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-semibold border border-bayan-600 transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Pengembalian Barang</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* REAL-TIME STATISTIK, GRAFIK ANALITIK & AUDIT AKTIVITAS TERKINI       */}
      {/* ==================================================================== */}
      <DashboardMetricsView />

      {/* Profil Sesi & Info Operasional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Identitas Pengelola */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <User className="w-4 h-4 text-bayan-700" />
              <span className="text-xs font-bold uppercase tracking-wider">Identitas Pengelola</span>
            </div>
            <p className="font-bold text-slate-900 text-lg">{user.nama}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">ID Petugas:</span>
            <span className="font-mono font-bold text-slate-800">{user.admin_id}</span>
          </div>
        </div>

        {/* Card 2: Role & Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <ShieldCheck className="w-4 h-4 text-bayan-700" />
              <span className="text-xs font-bold uppercase tracking-wider">Tingkat Akses Akun</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold text-slate-900">{user.role}</span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                {user.status}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {isSuperAdmin
              ? "Memiliki hak istimewa penuh: manajemen admin, konfigurasi, dan audit."
              : "Hak akses operasional: registrasi, sewa pakaian, dan pelaporan."}
          </div>
        </div>

        {/* Card 3: Zona Waktu Operasional */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Zona Waktu Sistem</span>
            </div>
            <p className="font-bold text-slate-900 text-base">WITA (Asia/Makassar)</p>
            <p className="text-xs text-slate-500 mt-0.5">UTC+09:00 | Waktu Operasional Resmi</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Jam Buka:</span>
            <span className="font-bold text-bayan-800">09:00 - 17:00 WITA</span>
          </div>
        </div>
      </div>

      {/* Grid Pintasan Modul Operasional */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <span>Modul Pengelolaan Operasional</span>
          </h2>
          <span className="text-xs text-slate-500">Pilih modul untuk mulai bertugas</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Modul 1: Registrasi Kunjungan */}
          <Link
            href="/dashboard/kunjungan"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 text-center hover:border-bayan-600 hover:shadow-lg transition-all group flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-bayan-50 text-bayan-800 flex items-center justify-center mb-3 group-hover:bg-bayan-800 group-hover:text-white transition-colors shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <span className="block text-xs font-bold text-slate-800 group-hover:text-bayan-800 transition-colors">
              Registrasi Kunjungan
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Buku Tamu Digital</span>
          </Link>

          {/* Modul 2: Sewa Pakaian Adat */}
          <Link
            href="/dashboard/transaksi"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 text-center hover:border-bayan-600 hover:shadow-lg transition-all group flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-700 group-hover:text-white transition-colors shadow-xs">
              <Shirt className="w-6 h-6" />
            </div>
            <span className="block text-xs font-bold text-slate-800 group-hover:text-bayan-800 transition-colors">
              Sewa Pakaian Adat
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Kasir & Invoice</span>
          </Link>

          {/* Modul 3: Pengembalian Pakaian */}
          <Link
            href="/dashboard/pengembalian"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 text-center hover:border-bayan-600 hover:shadow-lg transition-all group flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:bg-amber-700 group-hover:text-white transition-colors shadow-xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <span className="block text-xs font-bold text-slate-800 group-hover:text-bayan-800 transition-colors">
              Pengembalian Barang
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Cek Fisik & Selesai</span>
          </Link>

          {/* Modul 4: Inventaris Barang */}
          <Link
            href="/dashboard/inventaris"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 text-center hover:border-bayan-600 hover:shadow-lg transition-all group flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:bg-purple-700 group-hover:text-white transition-colors shadow-xs">
              <PackageCheck className="w-6 h-6" />
            </div>
            <span className="block text-xs font-bold text-slate-800 group-hover:text-bayan-800 transition-colors">
              Pelacakan Inventaris
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Barcode & Kondisi</span>
          </Link>

          {/* Modul 5: Statistik & Laporan */}
          <Link
            href="/dashboard/laporan"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 text-center hover:border-bayan-600 hover:shadow-lg transition-all group flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-700 group-hover:text-white transition-colors shadow-xs">
              <FileBarChart className="w-6 h-6" />
            </div>
            <span className="block text-xs font-bold text-slate-800 group-hover:text-bayan-800 transition-colors">
              Statistik & Laporan
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Grafik & Ekspor Excel</span>
          </Link>
        </div>
      </div>

      {/* Logout Action (Mempertahankan kompatibilitas form logout) */}
      <div className="pt-4 flex justify-end">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Sesi</span>
          </button>
        </form>
      </div>
    </div>
  );
}
