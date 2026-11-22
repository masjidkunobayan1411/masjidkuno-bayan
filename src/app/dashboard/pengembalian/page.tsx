"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shirt,
  User,
  ShieldCheck,
  Check,
  X,
  Loader2,
  SlidersHorizontal,
  FileText,
  AlertTriangle,
  History,
  Barcode,
} from "lucide-react";
import { ActiveRental, ReturnRecord, ReturnCondition } from "@/types";

interface ReturnItemForm {
  inventory_id: string;
  nama_produk_snapshot: string;
  kondisi_pengembalian: ReturnCondition;
  keterangan: string;
  selected: boolean;
}

export default function PengembalianPage() {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  // Active Rentals State
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Return History State
  const [historyItems, setHistoryItems] = useState<ReturnRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal Checklist Return State
  const [selectedTrx, setSelectedTrx] = useState<ActiveRental | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 1. Ambil Data Penyewaan Aktif
  const fetchActiveRentals = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setModalError("");

    try {
      const params = new URLSearchParams();
      params.append("mode", "active");
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/returns?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success && Array.isArray(json.data)) {
        setActiveRentals(json.data);
      } else {
        setActiveRentals([]);
      }
    } catch (err: any) {
      console.error("Gagal memuat penyewaan aktif:", err);
    } finally {
      setLoadingActive(false);
      setRefreshing(false);
    }
  };

  // 2. Ambil Riwayat Pengembalian
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/returns?mode=history&limit=50");
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setHistoryItems(json.data.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat riwayat pengembalian:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ACTIVE") {
      fetchActiveRentals();
    } else {
      fetchHistory();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchActiveRentals();
  };

  // Buka Modal Checklist Pengembalian untuk Transaksi Tertentu
  const openChecklistModal = (trx: ActiveRental) => {
    setSelectedTrx(trx);
    setModalError("");

    // Inisialisasi item checklist dari pending_items
    const initialForms: ReturnItemForm[] = (trx.pending_items || []).map((item) => ({
      inventory_id: item.inventory_id,
      nama_produk_snapshot: item.nama_produk_snapshot || "Busana Adat",
      kondisi_pengembalian: "BAIK",
      keterangan: "Pengembalian bersih & lengkap",
      selected: true,
    }));

    setReturnItems(initialForms);
  };

  // Ubah status kondisi pada checklist
  const handleItemConditionChange = (
    inventoryId: string,
    kondisi: ReturnCondition
  ) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.inventory_id === inventoryId
          ? {
              ...item,
              kondisi_pengembalian: kondisi,
              keterangan:
                kondisi === "BAIK"
                  ? "Kain bersih rapi"
                  : kondisi === "KOTOR_RINGAN"
                  ? "Pemakaian wajar, perlu jemur"
                  : kondisi === "RUSAK_RINGAN"
                  ? "Perlu dicuci / perbaikan jahitan"
                  : kondisi === "RUSAK_BERAT"
                  ? "Robek / rusak berat permanen"
                  : "Unit dinyatakan hilang",
            }
          : item
      )
    );
  };

  // Toggle selection item
  const handleToggleSelectItem = (inventoryId: string) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.inventory_id === inventoryId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Submit Checklist Pengembalian
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!selectedTrx) return;

    const selectedToReturn = returnItems.filter((i) => i.selected);
    if (selectedToReturn.length === 0) {
      setModalError("Pilih minimal 1 unit pakaian adat yang dikembalikan.");
      return;
    }

    setSubmittingReturn(true);

    try {
      const payload = {
        transaction_id: selectedTrx.transaction_id,
        items: selectedToReturn.map((item) => ({
          inventory_id: item.inventory_id,
          kondisi_pengembalian: item.kondisi_pengembalian,
          keterangan: item.keterangan,
        })),
      };

      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setModalError(json.message || "Gagal memproses pengembalian.");
        setSubmittingReturn(false);
        return;
      }

      setSuccessMessage(
        json.data?.is_completed
          ? `Seluruh pakaian pada transaksi [${selectedTrx.transaction_id}] telah selesai dikembalikan. Transaksi resmi SELESAI.`
          : `Berhasil mencatat pengembalian ${selectedToReturn.length} unit pakaian adat.`
      );

      setSelectedTrx(null);
      fetchActiveRentals();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: any) {
      setModalError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Ringkasan Angka
  const totalSewaAktif = activeRentals.length;
  const totalUnitDiPengunjung = activeRentals.reduce(
    (sum, r) => sum + Number(r.sisa_barang_kembali || 0),
    0
  );
  const totalKembaliHariIni = historyItems.length;

  const getKondisiBadge = (kondisi: string) => {
    switch (kondisi) {
      case "BAIK":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "KOTOR_RINGAN":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "RUSAK_RINGAN":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "RUSAK_BERAT":
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      case "HILANG":
        return "bg-slate-900 text-white border-slate-700 font-bold";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center shadow-sm">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span>Manajemen Pengembalian Busana Adat</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemeriksaan fisik pakaian adat pasca-sewa, rekonsiliasi stok inventaris, dan penutupan transaksi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (activeTab === "ACTIVE" ? fetchActiveRentals(true) : fetchHistory())}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-bayan-700 ${refreshing ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Pesan Sukses */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Grid Kartu Ringkasan Metrik */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Penyewaan Aktif
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
            {totalSewaAktif}
          </span>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">
            Transaksi Belum Kembali
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Unit di Pengunjung
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-bayan-800 font-mono">
            {totalUnitDiPengunjung}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Pakaian Adat Masih Dipakai</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Pengembalian Tercatat
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {totalKembaliHariIni}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">
            Histori Masuk Kembali
          </span>
        </div>
      </div>

      {/* Tab Navigasi */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("ACTIVE")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "ACTIVE"
              ? "border-bayan-800 text-bayan-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Penerimaan Pengembalian Aktif ({totalSewaAktif})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("HISTORY")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "HISTORY"
              ? "border-bayan-800 text-bayan-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Pengembalian</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PENERIMAAN PENGEMBALIAN AKTIF (CHECKLIST)                     */}
      {/* ==================================================================== */}
      {activeTab === "ACTIVE" && (
        <div className="space-y-4">
          {/* Pencarian */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID Transaksi (TRX-...) atau Nama Pengunjung..."
              className="w-full pl-10 pr-20 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-bayan-500 bg-white"
            />
            <button
              type="submit"
              className="absolute inset-y-1 right-1 px-3 rounded-lg bg-bayan-800 text-white text-[11px] font-bold hover:bg-bayan-700 transition-colors"
            >
              Cari
            </button>
          </form>

          {/* Daftar Kartu Penyewaan Aktif */}
          {loadingActive ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-bayan-700 mb-2" />
              <span>Memuat daftar transaksi sewa aktif...</span>
            </div>
          ) : activeRentals.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Tidak Ada Penyewaan Aktif yang Tertunda
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Semua pakaian adat yang disewa telah dikembalikan dengan lengkap, atau belum ada transaksi sewa berstatus DISEWA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRentals.map((trx) => (
                <div
                  key={trx.transaction_id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-bayan-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-bayan-900 bg-bayan-50 px-2.5 py-1 rounded-lg border border-bayan-200">
                        {trx.transaction_id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        DISEWA
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {trx.nama_pengunjung || "Pengunjung"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Sesi: {trx.visit_id} • Kontak: {trx.nomor_telepon || "-"}
                      </div>
                    </div>

                    {/* Progress Pengembalian */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Status Barang:</span>
                        <strong className="text-slate-900 font-mono">
                          {trx.total_barang_kembali || 0} / {trx.total_barang_disewa || 1} Dikembalikan
                        </strong>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{
                            width: `${
                              ((trx.total_barang_kembali || 0) /
                                (trx.total_barang_disewa || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-amber-700 font-semibold block">
                        Tersisa {trx.sisa_barang_kembali || 0} unit belum dikembalikan
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/transaksi/${trx.transaction_id}`}
                      className="text-slate-500 hover:text-slate-900 text-xs font-semibold"
                    >
                      Lihat Invoice
                    </Link>

                    <button
                      type="button"
                      onClick={() => openChecklistModal(trx)}
                      className="px-4 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-bayan-gold" />
                      <span>Checklist Pengembalian</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: RIWAYAT PENGEMBALIAN                                          */}
      {/* ==================================================================== */}
      {activeTab === "HISTORY" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu Pengembalian (WITA)</th>
                  <th className="py-3 px-4">ID Transaksi</th>
                  <th className="py-3 px-4">Barcode Unit Fisik</th>
                  <th className="py-3 px-4 text-center">Kondisi Pengembalian</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Petugas Penerima</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-bayan-700 mb-2" />
                      <span>Memuat riwayat pengembalian...</span>
                    </td>
                  </tr>
                ) : historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada riwayat pengembalian</p>
                    </td>
                  </tr>
                ) : (
                  historyItems.map((ret) => (
                    <tr key={ret.return_id} className="hover:bg-slate-50/70 font-mono">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {ret.waktu_pengembalian}
                      </td>
                      <td className="py-3 px-4 font-bold text-bayan-900">
                        {ret.transaction_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {ret.inventory_id}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getKondisiBadge(
                            ret.kondisi_pengembalian
                          )}`}
                        >
                          {ret.kondisi_pengembalian}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {ret.status_pengembalian}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans">{ret.petugas_id}</td>
                      <td className="py-3 px-4 text-slate-500 font-sans max-w-xs truncate">
                        {ret.keterangan || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CHECKLIST PENGEMBALIAN PAKAIAN ADAT                            */}
      {/* ==================================================================== */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-bayan-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-bayan-gold" />
                <div>
                  <h3 className="font-serif font-bold text-base">Checklist Pengembalian Busana</h3>
                  <span className="text-[11px] text-bayan-300 font-mono">
                    {selectedTrx.transaction_id} • {selectedTrx.nama_pengunjung}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrx(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-bayan-50 border border-bayan-200 text-bayan-950 text-xs">
                <span className="font-bold block mb-0.5">Petunjuk Pemeriksaan Fisik:</span>
                <span className="text-[11px] text-slate-600 block">
                  Periksa keutuhan kain, robekan, kelunturan, serta kotoran. Unit berstatus <strong>BAIK</strong> / <strong>KOTOR_RINGAN</strong> otomatis kembali ke status <strong>TERSEDIA</strong>. Unit <strong>RUSAK_RINGAN</strong> masuk status <strong>PERAWATAN (Cuci/Jahit)</strong>.
                </span>
              </div>

              {/* Daftar Checklist Item */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Daftar Pakaian Adat yang Dikembalikan:
                </span>

                {returnItems.map((item, idx) => (
                  <div
                    key={item.inventory_id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      item.selected
                        ? "bg-white border-bayan-400 shadow-xs"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelectItem(item.inventory_id)}
                          className="w-4 h-4 text-bayan-800 rounded-sm border-slate-300 focus:ring-bayan-500"
                        />
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {item.nama_produk_snapshot}
                          </span>
                          <span className="font-mono text-[11px] text-bayan-900 font-extrabold">
                            Barcode: {item.inventory_id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getKondisiBadge(
                          item.kondisi_pengembalian
                        )}`}
                      >
                        {item.kondisi_pengembalian}
                      </span>
                    </div>

                    {item.selected && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                        {/* Pilihan Kondisi Fisik */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Kondisi Fisik Pasca-Sewa:
                          </label>
                          <select
                            value={item.kondisi_pengembalian}
                            onChange={(e) =>
                              handleItemConditionChange(
                                item.inventory_id,
                                e.target.value as ReturnCondition
                              )
                            }
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                          >
                            <option value="BAIK">BAIK (Bersih & Rapi / TERSEDIA)</option>
                            <option value="KOTOR_RINGAN">KOTOR RINGAN (Layak / TERSEDIA)</option>
                            <option value="RUSAK_RINGAN">RUSAK RINGAN (Perlu Cuci/Jahit / PERAWATAN)</option>
                            <option value="RUSAK_BERAT">RUSAK BERAT (Robek Parah / RUSAK)</option>
                            <option value="HILANG">HILANG (Tidak Kembali / HILANG)</option>
                          </select>
                        </div>

                        {/* Catatan / Keterangan Petugas */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Catatan Pemeriksaan:
                          </label>
                          <input
                            type="text"
                            value={item.keterangan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReturnItems((prev) =>
                                prev.map((it) =>
                                  it.inventory_id === item.inventory_id
                                    ? { ...it, keterangan: val }
                                    : it
                                )
                              );
                            }}
                            placeholder="Catatan kebersihan/kerusakan..."
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTrx(null)}
                  disabled={submittingReturn}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn || returnItems.filter((i) => i.selected).length === 0}
                  className="px-5 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-950/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    Konfirmasi Pengembalian ({returnItems.filter((i) => i.selected).length} Unit)
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
