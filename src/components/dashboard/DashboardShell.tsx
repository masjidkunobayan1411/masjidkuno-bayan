"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  RotateCcw,
  Shirt,
  PackageCheck,
  FileBarChart,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Clock,
  Landmark,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  QrCode,
} from "lucide-react";
import { SessionUser } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  badge?: string;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Operasional Kunjungan",
    items: [
      {
        name: "Ringkasan Operasional",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Buku Kunjungan",
        href: "/dashboard/kunjungan",
        icon: Users,
      },
      {
        name: "Scan Presensi (HP)",
        href: "/dashboard/kunjungan/scan",
        icon: QrCode,
      },
      {
        name: "Transaksi Sewa & Kasir",
        href: "/dashboard/transaksi",
        icon: Receipt,
      },
      {
        name: "Pengembalian Pakaian",
        href: "/dashboard/pengembalian",
        icon: RotateCcw,
      },
    ],
  },
  {
    group: "Katalog & Inventaris",
    items: [
      {
        name: "Katalog Pakaian Adat",
        href: "/dashboard/produk",
        icon: Shirt,
      },
      {
        name: "Pelacakan Unit Fisik",
        href: "/dashboard/inventaris",
        icon: PackageCheck,
      },
      {
        name: "Laporan & Statistik",
        href: "/dashboard/laporan",
        icon: FileBarChart,
      },
    ],
  },
  {
    group: "Sistem & Konfigurasi",
    items: [
      {
        name: "Kelola Petugas Admin",
        href: "/dashboard/admin-management",
        icon: UserCheck,
        superAdminOnly: true,
        badge: "SUPER",
      },
      {
        name: "Pengaturan Sistem",
        href: "/dashboard/pengaturan",
        icon: Settings,
        superAdminOnly: true,
        badge: "SUPER",
      },
    ],
  },
];

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [witaTime, setWitaTime] = useState("");

  // Update Jam WITA Real-time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Makassar",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setWitaTime(new Intl.DateTimeFormat("id-ID", options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors">
      {/* ==================================================================== */}
      {/* 1. SIDEBAR DESKTOP & MOBILE DRAWER                                   */}
      {/* ==================================================================== */}

      {/* Backdrop Gelap untuk Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Container Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 dark:bg-slate-950 text-white flex flex-col border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Sidebar: Brand Identitas Bayan */}
        <div className="h-20 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/60 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden p-1.5">
              <img
                src="/media/logo/logo.png"
                onError={(e) => {
                  e.currentTarget.src = "/media/logo/logo.svg";
                }}
                alt="Logo Bayan Visitor"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-white block tracking-tight leading-none">
                BAYNEX
              </span>
              <span className="text-[10px] text-blue-400 block font-medium mt-1 uppercase tracking-wider">
                Panel Operasional
              </span>
            </div>
          </Link>

          {/* Tombol Tutup Sidebar pada Mobile */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profil Singkat Admin */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-slate-800/70 border border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 border border-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
              {user.nama ? user.nama.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {user.nama}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {user.email}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Hak Akses:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isSuperAdmin
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
              }`}
            >
              {user.role}
            </span>
          </div>
        </div>

        {/* Daftar Navigasi Berkelompok */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {NAV_GROUPS.map((group, gIdx) => {
            // Saring item yang khusus Super Admin bila user bukan Super Admin
            const visibleItems = group.items.filter(
              (item) => !item.superAdminOnly || isSuperAdmin
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1.5">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  {group.group}
                </span>

                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-amber-300"
                              : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Sidebar: Jam WITA & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 space-y-3">
          {/* Status Jam WITA */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-medium">WITA (UTC+8)</span>
            </div>
            <span className="font-mono font-bold text-white text-xs">
              {witaTime || "08:00:00"}
            </span>
          </div>

          {/* Form Keluar / Logout */}
          <form
            action="/api/auth/logout"
            method="POST"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await fetch("/api/auth/logout", { method: "POST" });
              } finally {
                window.location.href = "/login";
              }
            }}
          >
            <button
              type="submit"
              className="w-full py-2.5 px-3.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Sesi</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* 2. AREA KONTEN UTAMA & TOPBAR                                        */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Topbar Navigasi */}
        <header className="sticky top-0 z-30 h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs transition-colors">
          {/* Tombol Toggle Sidebar Mobile & Judul Halaman */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 lg:hidden"
              aria-label="Buka Menu Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 max-w-[190px] sm:max-w-md lg:max-w-none">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                <span>Dashboard</span>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-blue-600 dark:text-blue-400 font-bold capitalize truncate">
                  {pathname === "/dashboard"
                    ? "Ringkasan"
                    : pathname.replace("/dashboard/", "").replace("-", " ")}
                </span>
              </div>
              <h1 className="text-xs sm:text-lg font-bold text-slate-900 dark:text-white font-serif leading-tight mt-0.5 truncate">
                Pengelolaan Kunjungan
              </h1>
            </div>
          </div>

          {/* Topbar Kanan: Dark Mode, Quick Link ke Web Publik & Avatar */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Switcher */}
            <ThemeToggle />

            {/* Tautan Cepat ke Web Publik */}
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Buka Website Publik di Tab Baru"
            >
              <span>Website Publik</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            {/* User Status Pill */}
            <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-slate-200 dark:sm:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {user.nama ? user.nama.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                  {user.nama}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Quick Logout Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } finally {
                  window.location.href = "/login";
                }
              }}
              title="Keluar dari Akun"
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
