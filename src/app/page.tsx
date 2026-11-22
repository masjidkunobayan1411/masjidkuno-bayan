"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Globe,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Shirt,
  ScrollText,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  QrCode,
  Users,
  MessageSquare,
  HelpCircle,
  Phone,
  Camera,
  Landmark,
} from "lucide-react";
import { translations, Language } from "@/lib/i18n";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const [lang, setLang] = useState<Language>("ID");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<string>("#beranda");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Muat preferensi bahasa dari localStorage jika tersedia
  useEffect(() => {
    const savedLang = localStorage.getItem("bayan_lang") as Language;
    if (savedLang === "ID" || savedLang === "EN") {
      setLang(savedLang);
    }
  }, []);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("bayan_lang", newLang);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const t = translations[lang];

  // Menu Navbar Rapi: Menggunakan format ringkas simetris ala English Navbar (Home, Attire, Rules, History, Location, FAQ)
  // agar pill shape selalu seimbang, rapi, dan tidak berantakan di mode Bahasa Indonesia maupun English.
  const navItems = [
    { label: "Home", href: "#beranda" },
    { label: "Attire", href: "#pakaian-adat" },
    { label: "Rules", href: "#tata-tertib" },
    { label: "History", href: "#sejarah" },
    { label: "Location", href: "#lokasi" },
    { label: "FAQ", href: "#faq" },
  ];

  // FAQ Data Interaktif
  const faqs = [
    {
      q: "Mengapa pengunjung wajib mengenakan kain adat untuk masuk ke area masjid?",
      a: "Masjid Kuno Bayan adalah situs cagar budaya sakral bernilai religius dan spiritual tinggi. Sesuai hukum adat Bayan, pemakaian kain adat (Kain Poleng bagi pria, kain sarung dan sabuk bagi wanita) merupakan tanda penghormatan kesucian tempat ibadah dan memelihara kesetaraan serta tata krama pengunjung.",
    },
    {
      q: "Berapa tarif sewa pakaian adat dan apa saja fasilitas yang didapatkan?",
      a: "Tarif sewa busana adat sangat terjangkau: Kain Poleng Sasak Rp 20.000 dan Kain Batik Sasak Rp 10.000 per kunjungan (termasuk ikat kepala Sapuk dan Sabuk Anteng). Seluruh pakaian dicuci bersih, steril, harum, dan dipasangkan langsung oleh pamong adat di lokasi.",
    },
    {
      q: "Apakah pengunjung wanita yang sedang haid / berhalangan diperbolehkan masuk?",
      a: "Sesuai pantangan adat cagar budaya yang berlaku sejak abad ke-16, wanita yang sedang haid/nifas dan orang yang sedang dalam masa berkabung tidak diperkenankan memasuki area utama masjid. Namun, Anda tetap dipersilakan menikmati keindahan kawasan cagar budaya luar dan museum adat.",
    },
    {
      q: "Apakah bisa mendaftar langsung di lokasi jika belum mendaftar online?",
      a: "Bisa. Anda dapat melakukan pendaftaran langsung melalui smartphone Anda di loket atau dibantu oleh petugas resepsionis di pos pintu masuk menggunakan tablet pendaftaran digital.",
    },
    {
      q: "Bagaimana akses transportasi dan jam operasional kunjungan?",
      a: "Kawasan Cagar Budaya Masjid Kuno Bayan dibuka setiap hari pukul 09:00 - 17:00 WITA (UTC+8). Berlokasi di Desa Bayan, Lombok Utara, berjarak sekitar 2,5 jam perjalanan darat dari Kota Mataram atau Bandara Internasional Lombok.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-blue-600 selection:text-white">
      {/* ==================================================================== */}
      {/* 1. TOP NAVBAR / HEADER DENGAN LOGO KUSTOM & ACTIVE PILL SHAPE        */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Kustom & Brand Identity (Bisa Diubah via public/media/logo/logo.jpg) */}
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-bayan-800 to-bayan-900 border border-blue-500/60 flex items-center justify-center p-1.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                <img
                  src="/media/logo/logo.jpg"
                  onError={(e) => {
                    e.currentTarget.src = "/media/logo/logo.svg";
                  }}
                  alt="Logo Bayan Visitor"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white block leading-none">
                  BAYNEX
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-1 tracking-wider uppercase">
                  Portal Masjid Kuno Bayan
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Rapi Sesuai Format Navbar English) */}
            <nav className="hidden lg:flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">
              <a
                href="#beranda"
                onClick={() => setActiveNav("#beranda")}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                  activeNav === "#beranda"
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                Home
              </a>
              <a
                href="#pakaian-adat"
                onClick={() => setActiveNav("#pakaian-adat")}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                  activeNav === "#pakaian-adat"
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                Attire
              </a>
              <a
                href="#tata-tertib"
                onClick={() => setActiveNav("#tata-tertib")}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                  activeNav === "#tata-tertib"
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                Rules
              </a>
              <a
                href="#sejarah"
                onClick={() => setActiveNav("#sejarah")}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                  activeNav === "#sejarah"
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                History
              </a>
              <a
                href="#lokasi"
                onClick={() => setActiveNav("#lokasi")}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                  activeNav === "#lokasi"
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                Location
              </a>
              <a
                href="#faq"
                onClick={() => setActiveNav("#faq")}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                  activeNav === "#faq"
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                FAQ
              </a>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Tombol Dark Mode Switcher */}
              <ThemeToggle />

              {/* Language Switcher Pill */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => handleLangChange("ID")}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    lang === "ID"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  ID
                </button>
                <button
                  onClick={() => handleLangChange("EN")}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    lang === "EN"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Login Admin Link */}
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.nav.adminLogin}
              </Link>

              {/* Primary CTA Button (Skyline Royal Blue) */}
              <Link
                href="/registrasi"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all transform hover:-translate-y-0.5"
              >
                <span>{t.nav.register}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Hamburger & Dark Mode */}
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6 space-y-2.5 shadow-xl">
            {navItems.map((item) => {
              const isActive = activeNav === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setActiveNav(item.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Bahasa:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLangChange("ID")}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    lang === "ID" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Indonesia
                </button>
                <button
                  onClick={() => handleLangChange("EN")}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    lang === "EN" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-2">
              <Link
                href="/registrasi"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-xl font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30"
              >
                {t.nav.register}
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {t.nav.adminLogin}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ==================================================================== */}
      {/* 2. FULL-WIDTH HERO SECTION (Terpadu: Tulisan di Atas Gambar Hero)     */}
      {/* ==================================================================== */}
      <section id="beranda" className="pt-6 sm:pt-8 pb-16 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 relative overflow-hidden transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* CONTAINER HERO TERPADU (Foto Hero Berada di Bawah Seluruh Tulisan) */}
          <div className="relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/25 border border-slate-200/90 dark:border-slate-800 bg-slate-950 min-h-[500px] sm:min-h-[560px] lg:min-h-[620px] flex items-center justify-center text-center p-6 sm:p-10 lg:p-16 group transition-all">
            
            {/* Foto Panorama Hero di Bawah Seluruh Tulisan (Dapat diperbarui langsung dari Pengaturan Super Admin) */}
            <img
              src="/api/media/custom/hero-bayan"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes("/api/media/custom/")) {
                  target.src = "/media/photos/heritage/hero-bayan.jpg";
                } else {
                  target.src = "/media/photos/heritage/hero-bayan.svg";
                }
              }}
              alt="Panorama Cagar Budaya Masjid Kuno Bayan"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />

            {/* Gradient Sinematik Multilayer: Memastikan Tulisan Sangat Jelas Terbaca (High Contrast) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-slate-950/65 pointer-events-none" />
            <div className="absolute inset-0 bg-blue-950/40 mix-blend-multiply pointer-events-none" />

            {/* SELURUH KONTEN & TULISAN DI ATAS GAMBAR HERO */}
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-5 sm:space-y-6">
              
              {/* 1. Badge Kicker: Situs Cagar Budaya Nasional | Abad ke-16 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/85 backdrop-blur-md border border-blue-400/50 text-blue-200 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.hero.badge}</span>
              </div>

              {/* 2. Headline Utama: Selamat Datang di Masjid Kuno Bayan */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.14] drop-shadow-lg">
                {t.hero.title}{" "}
                <span className="text-amber-300 bayan-gold drop-shadow-md">
                  {t.hero.titleHighlight}
                </span>
              </h1>

              {/* 3. Subtitle / Deskripsi Keheningan Spiritual & Arsitektur */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-200 leading-relaxed font-normal max-w-2xl sm:max-w-3xl drop-shadow-md">
                {t.hero.subtitle}
              </p>

              {/* 4. Action Buttons: Daftar Registrasi Pengunjung & Katalog Busana Adat */}
              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                <Link
                  href="/registrasi"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/40 hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5"
                >
                  <span>{t.hero.registerCta}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="#pakaian-adat"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/30 shadow-lg hover:border-white/50 transition-all transform hover:-translate-y-0.5"
                >
                  <Shirt className="w-5 h-5 text-amber-300" />
                  <span>Katalog Busana Adat</span>
                </a>
              </div>

            </div>

          </div>

        </div>

        {/* ================================================================== */}
        {/* 3. FLOATING 4-METRIC / VALUE BAR (Mengambang Tepat di Bawah Hero)   */}
        {/* ================================================================== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/70 dark:shadow-black/40 border border-slate-200/90 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 transition-colors">
            
            {/* Value 1 */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                  {t.hero.statAge}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.hero.statAgeDesc}
                </span>
              </div>
            </div>

            {/* Value 2 */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800">
                <Shirt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                  {t.hero.statAttire}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.hero.statAttireDesc}
                </span>
              </div>
            </div>

            {/* Value 3 */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-800">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                  {t.hero.statHeritage}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.hero.statHeritageDesc}
                </span>
              </div>
            </div>

            {/* Value 4 */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                  {t.hero.statTimezone}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.hero.statTimezoneDesc}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. SECTION: BUSANA ADAT (3 Card Grid "Built for Every Need" - Blue)  */}
      {/* ==================================================================== */}
      <section id="pakaian-adat" className="py-20 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {t.attire.sectionBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t.attire.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              {t.attire.subtitle}
            </p>
          </div>

          {/* 3-Card Grid With Real Photos / SVG Fallbacks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Kain Poleng Sasak / Bayan */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src="/api/media/custom/kainpoleng"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("/api/media/custom/")) {
                      target.src = "/media/photos/products/kainpoleng.jpg";
                    } else if (target.src.includes("kainpoleng.jpg")) {
                      target.src = "/media/photos/products/kain-poleng.jpg";
                    } else {
                      target.src = "/media/photos/products/kainpoleng.svg";
                    }
                  }}
                  alt={t.attire.item1Title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex gap-1.5">
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider">
                    {t.attire.item1Category}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-blue-700 text-[10px] text-white font-mono font-bold">
                    Kode: POL
                  </span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold shadow-md">
                    {t.attire.item1Price}
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t.attire.item1Title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {t.attire.item1Desc}
                  </p>
                </div>
                <Link
                  href="/registrasi"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 pt-2 group-hover:translate-x-1 transition-all"
                >
                  <span>Pesan Sewa di Loket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Kain Batik Sasak Lombok */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src="/api/media/custom/kainbatik"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("/api/media/custom/")) {
                      target.src = "/media/photos/products/kainbatik.jpg";
                    } else if (target.src.includes("kainbatik.jpg")) {
                      target.src = "/media/photos/products/kain-batik.jpg";
                    } else {
                      target.src = "/media/photos/products/kainbatik.svg";
                    }
                  }}
                  alt={t.attire.item2Title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex gap-1.5">
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider">
                    {t.attire.item2Category}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-blue-700 text-[10px] text-white font-mono font-bold">
                    Kode: BAT
                  </span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold shadow-md">
                    {t.attire.item2Price}
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t.attire.item2Title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {t.attire.item2Desc}
                  </p>
                </div>
                <Link
                  href="/registrasi"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 pt-2 group-hover:translate-x-1 transition-all"
                >
                  <span>Pesan Sewa di Loket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 3: Sapuk & Sabuk Anteng */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src="/api/media/custom/sapukjong"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("/api/media/custom/")) {
                      target.src = "/media/photos/products/sapukjong.jpg";
                    } else if (target.src.includes("sapukjong.jpg")) {
                      target.src = "/media/photos/products/sapuk-sabuk.jpg";
                    } else {
                      target.src = "/media/photos/products/sapukjong.svg";
                    }
                  }}
                  alt={t.attire.item3Title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold uppercase tracking-wider">
                    {t.attire.item3Category}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold shadow-md">
                    {t.attire.item3Price}
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t.attire.item3Title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {t.attire.item3Desc}
                  </p>
                </div>
                <a
                  href="#tata-tertib"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 pt-2 group-hover:translate-x-1 transition-all"
                >
                  <span>Pesan Sewa di Loket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {t.attire.includedNotice}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. SECTION: ALUR KUNJUNGAN & 6 ATURAN ADAT (Skyline Blue Style)      */}
      {/* ==================================================================== */}
      <section id="tata-cara" className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-3 py-1 rounded-full">
              Tata Cara Kunjungan
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              5 Langkah Berwisata Tertib &amp; Penuh Berkah
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Alur terpadu memadukan kemudahan teknologi digital dan penghormatan adat istiadat leluhur Bayan.
            </p>
          </div>

          {/* 5 Pipeline Steps with Connecting Line (Skyline Style Blue Circles) */}
          <div className="relative mb-20">
            {/* Desktop Connector Line */}
            <div className="hidden lg:block absolute top-1/2 left-10 right-10 -translate-y-8 h-1 bg-slate-200 dark:bg-slate-700 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
              
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30 ring-4 ring-white dark:ring-slate-900">
                  1
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Registrasi Online</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Isi formulir pendaftaran nama dan rombongan via smartphone dalam 1 menit.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30 ring-4 ring-white dark:ring-slate-900">
                  2
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Dapatkan E-Tiket</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Terima tiket resmi lengkap dengan barcode QR unik dan simpan di HP Anda.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30 ring-4 ring-white dark:ring-slate-900">
                  3
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Scan di Pos Loket</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tunjukkan QR code kepada petugas di pintu masuk untuk validasi instan.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30 ring-4 ring-white dark:ring-slate-900">
                  4
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Kenakan Busana</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sewa kain adat bersih dan kenakan dibantu pamong adat sesuai pakem.
                </p>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/30 ring-4 ring-white dark:ring-slate-900">
                  5
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Wisata Berkah</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Menikmati keindahan, ketenangan batin, dan nilai sejarah cagar budaya.
                </p>
              </div>

            </div>
          </div>

          {/* 6 Mandatory Adat Rules Grid */}
          <div id="tata-tertib" className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-3 py-1 rounded-full">
                {t.rules.sectionBadge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {t.rules.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {t.rules.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Rule 1 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Shirt className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{t.rules.rule1Title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.rules.rule1Desc}</p>
              </div>

              {/* Rule 2 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{t.rules.rule2Title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.rules.rule2Desc}</p>
              </div>

              {/* Rule 3 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{t.rules.rule3Title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.rules.rule3Desc}</p>
              </div>

              {/* Rule 4 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{t.rules.rule4Title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.rules.rule4Desc}</p>
              </div>

              {/* Rule 5 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ScrollText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{t.rules.rule5Title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.rules.rule5Desc}</p>
              </div>

              {/* Rule 6 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{t.rules.rule6Title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.rules.rule6Desc}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. SECTION: BANNER BLUEPRINT KEUNIKAN (Skyline Royal Blue Banner)    */}
      {/* ==================================================================== */}
      <section id="sejarah" className="py-16 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden relative">
            
            {/* Background Texture */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
              
              {/* Left Blueprint / Visual Illustration */}
              <div className="lg:col-span-5 bg-white/10 border border-white/20 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-inner group">
                <div className="aspect-[4/3] rounded-xl overflow-hidden relative shadow-lg border border-white/10 bg-slate-950">
                  <img
                    src="/api/media/custom/jejak-peradaban"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes("/api/media/custom/")) {
                        target.src = "/media/photos/heritage/jejak-peradaban.jpg";
                      } else if (target.src.endsWith("jejak-peradaban.jpg")) {
                        target.src = "/media/photos/heritage/masjid-kuno.jpg";
                      } else if (target.src.endsWith("masjid-kuno.jpg")) {
                        target.src = "/media/photos/heritage/jejak-peradaban.png";
                      } else if (target.src.endsWith("jejak-peradaban.png")) {
                        target.src = "/media/photos/heritage/masjid-kuno.png";
                      } else {
                        target.src = "/media/photos/heritage/masjid-kuno.svg";
                      }
                    }}
                    alt="Arsitektur Bambu Masjid Kuno Bayan"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                  {/* Badge & Caption */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-mono font-bold text-amber-300 border border-white/10">
                      ARSITEKTUR VERNAKULAR SASAK
                    </span>
                    <span className="hidden sm:inline-block bg-blue-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-slate-200 border border-white/10">
                      Abad XVI
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Content & Key Metrics */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300 bayan-gold block mb-2">
                    {t.history.sectionBadge}
                  </span>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                    {t.history.title}
                  </h3>
                </div>

                <p className="text-sm sm:text-base text-blue-100 leading-relaxed font-normal">
                  {t.history.subtitle} Dibangun tanpa menggunakan paku besi satu pun. Mengandalkan pasak kayu ulin, dinding anyaman bambu lentur, dan atap rumbia ijuk yang membuat sirkulasi udara tetap sejuk dan mampu meredam guncangan gempa bumi Lombok.
                </p>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-white/15">
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 bayan-gold block">
                      500+
                    </span>
                    <span className="text-xs text-blue-200 mt-1 block font-medium">
                      Tahun Berdiri Sejak Abad XVI
                    </span>
                  </div>

                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 bayan-gold block">
                      100%
                    </span>
                    <span className="text-xs text-blue-200 mt-1 block font-medium">
                      Material Alami Pasak Kayu
                    </span>
                  </div>

                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 bayan-gold block">
                       Batu alam
                    </span>
                    <span className="text-xs text-blue-200 mt-1 block font-medium">
                      Susunan Pondasi menggunakan batu alami.
                    </span>
                  </div>

                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 bayan-gold block">
                      Abadi
                    </span>
                    <span className="text-xs text-blue-200 mt-1 block font-medium">
                      Tradisi Maulid Adat
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. SECTION: GALERI (Persis 3-Card Grid "Featured Projects")           */}
      {/* ==================================================================== */}
      <section id="lokasi" className="py-20 bg-slate-50 dark:bg-slate-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-3 py-1 rounded-full">
                {t.location.sectionBadge}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
                Suasana &amp; Jejak Sejarah Bayan
              </h2>
            </div>
            <Link
              href="/registrasi"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
            >
              <span>Jadwalkan Kunjungan Anda</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 2 Gallery Cards: 1. Masjid Kuno, 2. Makam Wali */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Gallery 1: Masjid Kuno */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 group">
              <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src="/api/media/custom/masjid-kuno"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("/api/media/custom/")) {
                      target.src = "/media/photos/heritage/masjid-kuno.jpg";
                    } else {
                      target.src = "/media/photos/heritage/masjid-kuno.svg";
                    }
                  }}
                  alt="Kompleks Utama Masjid Kuno Bayan"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Kompleks Utama Cagar Budaya Abad ke-16</span>
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mt-1">
                  Masjid Kuno Bayan
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Bangunan sakral masjid kayu bertiang empat dengan dinding anyaman bambu (bedek) beratap rumbia, saksi sejarah awal penyebaran agama Islam tertua di Pulau Lombok.
                </p>
              </div>
            </div>

            {/* Gallery 2: Makam Wali */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 group">
              <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src="/api/media/custom/makam-wali"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("/api/media/custom/")) {
                      target.src = "/media/photos/heritage/makam-wali.jpg";
                    } else if (target.src.endsWith(".jpg")) {
                      target.src = "/media/photos/heritage/jejak-peradaban.jpg";
                    } else {
                      target.src = "/media/photos/heritage/masjid-kuno.svg";
                    }
                  }}
                  alt="Kompleks Makam Para Wali Bayan"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Situs Religi Kompleks Makam Para Wali</span>
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mt-1">
                  Makam Para Wali &amp; Sesepuh
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Tempat persemayaman para penyebar agama Islam mula-mula dan sesepuh adat Bayan yang dikelilingi susunan pagar batu alam yang hening dan sakral.
                </p>
              </div>
            </div>

          </div>

          {/* Lokasi & Operasional Info Bar */}
          <div className="mt-12 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">{t.location.addressValue}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {t.location.hoursValue}
              </span>
              <span className="font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                WITA (UTC+8)
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 8. SECTION: CTA CARD + FAQ ACCORDION (Skyline Blue Theme)            */}
      {/* ==================================================================== */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Solid Blue CTA Card (Ready to Visit?) */}
            <div className="lg:col-span-5 bg-blue-600 dark:bg-blue-700 text-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-blue-600/20 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                  Siap Berkunjung ke Masjid Kuno Bayan?
                </h3>
                <p className="text-sm text-blue-50 leading-relaxed font-normal">
                  Daftarkan rencana kunjungan Anda sekarang untuk mendapatkan E-Tiket barcode QR resmi dan pengalaman wisata budaya yang tertib dan berkesan.
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/20">
                <Link
                  href="/registrasi"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold bg-white text-blue-700 hover:bg-blue-50 transition-all shadow-md text-sm"
                >
                  <span>Daftar Kunjungan Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-[11px] text-blue-100 text-center">
                  Jam operasional pos loket: 09:00 - 17:00 WITA (UTC+8)
                </p>
              </div>
            </div>

            {/* Right Interactive Accordion FAQ */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-3 py-1 rounded-full">
                  FAQ
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2 mb-6">
                  Pertanyaan Sering Diajukan
                </h2>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <div
                      key={index}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-200"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full p-5 text-left flex items-center justify-between gap-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {faq.q}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 9. FOOTER DENGAN LOGO KUSTOM                                         */}
      {/* ==================================================================== */}
      <footer className="bg-slate-950 text-slate-400 text-xs sm:text-sm pt-16 pb-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            
            {/* Col 1 & 2: Brand & Identity (Custom Logo) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 border border-blue-500 flex items-center justify-center p-1.5 shadow-md overflow-hidden">
                  <img
                    src="/media/logo/logo.jpg"
                    onError={(e) => {
                      e.currentTarget.src = "/media/logo/logo.svg";
                    }}
                    alt="Logo Bayan Visitor"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-serif text-xl font-bold tracking-tight text-white block">
                    BAYNEX
                  </span>
                  <span className="text-[10px] text-blue-400 uppercase tracking-widest block font-medium">
                    Portal Wisata Masjid Kuno Bayan
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Sistem Digital Pengelolaan Kunjungan, E-Tiket Barcode QR, dan Manajemen Penyewaan Pakaian Adat Situs Cagar Budaya Nasional Masjid Kuno Bayan.
              </p>

              <div className="pt-2 text-xs text-slate-500">
                <span>{t.footer.rulesNotice}</span>
              </div>
            </div>

            {/* Col 3: Navigasi Cepat */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                {t.footer.quickLinks}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#beranda" className="hover:text-blue-400 transition-colors">
                    {t.nav.home}
                  </a>
                </li>
                <li>
                  <Link href="/registrasi" className="hover:text-blue-400 transition-colors">
                    {t.nav.register}
                  </Link>
                </li>
                <li>
                  <a href="#pakaian-adat" className="hover:text-blue-400 transition-colors">
                    {t.nav.attire}
                  </a>
                </li>
                <li>
                  <a href="#tata-tertib" className="hover:text-blue-400 transition-colors">
                    {t.nav.rules}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-blue-400 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Layanan Sistem */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Layanan Sistem
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-slate-400">E-Tiket Barcode QR</span>
                </li>
                <li>
                  <span className="text-slate-400">Kasir Sewa Tunai &amp; QRIS</span>
                </li>
                <li>
                  <span className="text-slate-400">Pelacakan Inventaris Busana</span>
                </li>
                <li>
                  <span className="text-slate-400">Statistik Kunjungan Real-time</span>
                </li>
                <li>
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                    {t.nav.adminLogin} &rarr;
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Lokasi & Operasional */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                {t.location.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.location.addressValue}
              </p>
              <div className="text-xs text-slate-400 space-y-1 pt-1">
                <p>⏰ <strong>Buka:</strong> {t.location.hoursValue}</p>
                <p>📍 Zona Waktu WITA (UTC+8)</p>
              </div>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>
              {t.footer.copyright}
            </p>
            <p className="text-[11px]">
              {t.footer.rightsReserved}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
