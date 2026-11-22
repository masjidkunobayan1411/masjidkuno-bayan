"use client";

import React, { useState, useEffect } from "react";
import {
  PackageCheck,
  Plus,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Shirt,
  Calendar,
  Info,
  X,
  Loader2,
  Barcode,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { Product } from "@/types";

interface InventoryItemEnriched {
  inventory_id: string;
  product_id: string;
  kode_barang: string;
  kondisi: "BAIK" | "CUKUP" | "PERLU_PERBAIKAN";
  status: "TERSEDIA" | "DITAHAN" | "DISEWA" | "PERAWATAN" | "RUSAK" | "HILANG";
  tanggal_masuk: string;
  keterangan: string;
  nama_produk?: string;
  kode_produk?: string;
  harga_sewa?: number;
  satuan?: string;
}

export default function InventarisPage() {
  const [items, setItems] = useState<InventoryItemEnriched[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [kondisiFilter, setKondisiFilter] = useState("ALL");

  // Notifications
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Modals
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Single Item Form State
  const [singleProductId, setSingleProductId] = useState("");
  const [singleKodeBarang, setSingleKodeBarang] = useState("");
  const [singleKondisi, setSingleKondisi] = useState("BAIK");
  const [singleStatus, setSingleStatus] = useState("TERSEDIA");
  const [singleKeterangan, setSingleKeterangan] = useState("");

  // Batch Form State
  const [batchProductId, setBatchProductId] = useState("");
  const [batchPrefix, setBatchPrefix] = useState("POL");
  const [batchCount, setBatchCount] = useState(10);
  const [batchStartNum, setBatchStartNum] = useState(1);
  const [batchKeterangan, setBatchKeterangan] = useState("Pendaftaran batch awal");

  // Edit Form State
  const [editInventoryId, setEditInventoryId] = useState("");
  const [editKodeBarang, setEditKodeBarang] = useState("");
  const [editNamaProduk, setEditNamaProduk] = useState("");
  const [editKondisi, setEditKondisi] = useState("BAIK");
  const [editStatus, setEditStatus] = useState("TERSEDIA");
  const [editKeterangan, setEditKeterangan] = useState("");

  // 1. Ambil Data Produk Katalog untuk Dropdown Pilihan
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setProducts(json.data);
          if (json.data.length > 0) {
            setSingleProductId(json.data[0].product_id);
            setBatchProductId(json.data[0].product_id);
            setBatchPrefix(json.data[0].kode_produk);
          }
        }
      })
      .catch((err) => console.error("Gagal memuat produk:", err));
  }, []);

  // 2. Ambil Daftar Unit Inventaris
  const fetchInventory = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      if (productFilter !== "ALL") params.append("product_id", productFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (kondisiFilter !== "ALL") params.append("kondisi", kondisiFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setItems(json.data.items || []);
      } else {
        setErrorMessage(json.message || "Gagal memuat unit inventaris.");
      }
    } catch (err: any) {
      setErrorMessage("Koneksi ke server gagal saat memuat inventaris.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [productFilter, statusFilter, kondisiFilter]);

  // Handle Search Input dengan Enter atau Debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  // Submit Single Item Form
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    try {
      const payload = {
        is_batch: false,
        product_id: singleProductId,
        kode_barang: singleKodeBarang,
        kondisi: singleKondisi,
        status: singleStatus,
        keterangan: singleKeterangan,
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setModalError(json.message || "Gagal mendaftarkan unit inventaris.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`Unit [${singleKodeBarang.toUpperCase()}] berhasil didaftarkan.`);
      setSingleModalOpen(false);
      setSingleKodeBarang("");
      fetchInventory();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setModalError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Batch Create Form
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    try {
      const payload = {
        is_batch: true,
        product_id: batchProductId,
        prefix_kode: batchPrefix,
        jumlah: Number(batchCount),
        mulai_nomor: Number(batchStartNum),
        keterangan: batchKeterangan,
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setModalError(json.message || "Gagal mendaftarkan unit batch.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        `Berhasil mendaftarkan ${json.data?.created_count || batchCount} unit fisik inventaris secara massal.`
      );
      setBatchModalOpen(false);
      fetchInventory();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setModalError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Status / Condition Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    try {
      const payload = {
        kondisi: editKondisi,
        status: editStatus,
        keterangan: editKeterangan,
      };

      const res = await fetch(`/api/inventory/${editInventoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setModalError(json.message || "Gagal memperbarui unit.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`Status unit [${editKodeBarang}] berhasil diperbarui.`);
      setEditModalOpen(false);
      fetchInventory();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setModalError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: InventoryItemEnriched) => {
    setEditInventoryId(item.inventory_id);
    setEditKodeBarang(item.kode_barang);
    setEditNamaProduk(item.nama_produk || "-");
    setEditKondisi(item.kondisi);
    setEditStatus(item.status);
    setEditKeterangan(item.keterangan || "");
    setModalError("");
    setEditModalOpen(true);
  };

  // Metrik Ringkasan Status 6-Tingkat
  const totalUnit = items.length;
  const unitTersedia = items.filter((i) => i.status === "TERSEDIA").length;
  const unitDisewa = items.filter((i) => i.status === "DISEWA").length;
  const unitPerawatan = items.filter((i) => i.status === "PERAWATAN").length;
  const unitRusakHilang = items.filter((i) => i.status === "RUSAK" || i.status === "HILANG").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "TERSEDIA":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "DITAHAN":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "DISEWA":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "PERAWATAN":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "RUSAK":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HILANG":
        return "bg-slate-800 text-white border-slate-700";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getConditionBadge = (kondisi: string) => {
    switch (kondisi) {
      case "BAIK":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CUKUP":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PERLU_PERBAIKAN":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center shadow-sm">
              <PackageCheck className="w-5 h-5" />
            </div>
            <span>Pelacakan Unit Fisik Inventaris</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pelacakan nomor unik barcode, kondisi fisik, dan 6 tingkatan status siklus sewa pakaian adat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchInventory(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
            title="Segarkan Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-bayan-700 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalError("");
              setSingleModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-bayan-700" />
            <span>+ Unit Tunggal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalError("");
              setBatchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-950/20 transition-all active:scale-95"
          >
            <Layers className="w-4 h-4 text-bayan-gold" />
            <span>+ Unit Massal (Batch)</span>
          </button>
        </div>
      </div>

      {/* Notifikasi Sukses */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Grid Kartu Status 6-Tingkat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Total Unit
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {totalUnit}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Seluruh Koleksi</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Tersedia (Siap Sewa)
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {unitTersedia}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">Siap di Pos</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Sedang Disewa
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
            {unitDisewa}
          </span>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">Di Kawasan Cagar</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Dalam Perawatan / Cuci
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-purple-700 font-mono">
            {unitPerawatan}
          </span>
          <span className="text-[10px] text-purple-600 font-medium block mt-1">Pembersihan</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
            Rusak / Hilang
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-mono">
            {unitRusakHilang}
          </span>
          <span className="text-[10px] text-rose-600 font-medium block mt-1">Perlu Tindakan</span>
        </div>
      </div>

      {/* Toolbar Filter & Pencarian Barcode */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Form Search Barcode */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Barcode className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan barcode / cari kode barang (misal: POL-001)..."
            className="w-full pl-10 pr-20 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-bayan-500 bg-slate-50/50 hover:bg-white focus:bg-white uppercase"
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3 rounded-lg bg-bayan-800 text-white text-[11px] font-bold hover:bg-bayan-700 transition-colors"
          >
            Cari
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Produk */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-bayan-500"
          >
            <option value="ALL">Semua Busana</option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.nama_produk} ({p.kode_produk})
              </option>
            ))}
          </select>

          {/* Filter Status 6-Tingkat */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-bayan-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="TERSEDIA">TERSEDIA (Siap Sewa)</option>
            <option value="DISEWA">DISEWA</option>
            <option value="DITAHAN">DITAHAN</option>
            <option value="PERAWATAN">PERAWATAN (Cuci)</option>
            <option value="RUSAK">RUSAK</option>
            <option value="HILANG">HILANG</option>
          </select>

          {/* Filter Kondisi */}
          <select
            value={kondisiFilter}
            onChange={(e) => setKondisiFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-bayan-500"
          >
            <option value="ALL">Semua Kondisi</option>
            <option value="BAIK">Kondisi Baik</option>
            <option value="CUKUP">Kondisi Cukup</option>
            <option value="PERLU_PERBAIKAN">Perlu Perbaikan</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Unit Fisik Inventaris */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-bayan-700 mx-auto mb-2" />
            <p className="text-xs font-semibold">Memuat data unit fisik inventaris...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Belum ada unit inventaris terdaftar</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Gunakan tombol <strong>+ Unit Tunggal</strong> atau <strong>+ Unit Massal (Batch)</strong> untuk mendaftarkan unit barcode pakaian adat pertama Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Kode Barcode</th>
                  <th className="py-3.5 px-4">Jenis Busana Adat</th>
                  <th className="py-3.5 px-4">Kondisi Fisik</th>
                  <th className="py-3.5 px-4">Status Ketersediaan</th>
                  <th className="py-3.5 px-4">Tgl Masuk</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.inventory_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Kode Barang */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-bold text-sm text-bayan-950 px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                          {item.kode_barang}
                        </span>
                      </div>
                    </td>

                    {/* Produk Terkait */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">
                        {item.nama_produk || "-"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        ID: {item.product_id}
                      </span>
                    </td>

                    {/* Kondisi Fisik */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getConditionBadge(
                          item.kondisi
                        )}`}
                      >
                        {item.kondisi?.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Status 6 Tingkat */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Tanggal Masuk */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono">
                      {item.tanggal_masuk || "-"}
                    </td>

                    {/* Keterangan */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {item.keterangan || "-"}
                    </td>

                    {/* Aksi Ubah Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-bayan-50 text-slate-700 hover:text-bayan-800 border border-slate-200 transition-colors shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-bayan-700" />
                        <span>Ubah Status</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Card */}
        <div className="bg-slate-50/90 p-4 border-t border-slate-200 flex items-center justify-between text-slate-500 text-xs">
          <span>Menampilkan {items.length} unit fisik terdaftar</span>
          <span className="font-medium text-slate-600">
            Kepatuhan Anti Double-Booking Aktif (Atomic Locking)
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: TAMBAH UNIT TUNGGAL                                         */}
      {/* ==================================================================== */}
      {singleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="bg-bayan-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-bayan-gold" />
                <h3 className="font-serif font-bold text-base">Tambah Unit Fisik Tunggal</h3>
              </div>
              <button
                type="button"
                onClick={() => setSingleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Pilih Produk Terkait */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Produk Busana Adat *
                </label>
                <select
                  value={singleProductId}
                  onChange={(e) => {
                    setSingleProductId(e.target.value);
                    const sel = products.find((p) => p.product_id === e.target.value);
                    if (sel && !singleKodeBarang) {
                      setSingleKodeBarang(`${sel.kode_produk}-001`);
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-bayan-500"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.nama_produk} ({p.kode_produk})
                    </option>
                  ))}
                </select>
              </div>

              {/* Kode Barang (Barcode Fisik) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Kode Barang / Barcode Fisik *
                </label>
                <input
                  type="text"
                  value={singleKodeBarang}
                  onChange={(e) => setSingleKodeBarang(e.target.value.toUpperCase())}
                  placeholder="Contoh: POL-001"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-bayan-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Nomor barcode fisik ditempelkan pada pakaian adat
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Kondisi Awal */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kondisi Awal *
                  </label>
                  <select
                    value={singleKondisi}
                    onChange={(e) => setSingleKondisi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="BAIK">BAIK (Baru/Layak)</option>
                    <option value="CUKUP">CUKUP (Pemakaian)</option>
                    <option value="PERLU_PERBAIKAN">PERLU PERBAIKAN</option>
                  </select>
                </div>

                {/* Status Awal */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status Ketersediaan *
                  </label>
                  <select
                    value={singleStatus}
                    onChange={(e) => setSingleStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="TERSEDIA">TERSEDIA (Siap Sewa)</option>
                    <option value="DITAHAN">DITAHAN</option>
                    <option value="PERAWATAN">PERAWATAN (Cuci)</option>
                  </select>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  value={singleKeterangan}
                  onChange={(e) => setSingleKeterangan(e.target.value)}
                  placeholder="Ukuran, ciri fisik khusus, dll..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bayan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSingleModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-900/20 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Daftarkan Unit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: PENDAFTARAN MASSAL (BATCH CREATION)                         */}
      {/* ==================================================================== */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="bg-bayan-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-bayan-gold" />
                <div>
                  <h3 className="font-serif font-bold text-base">Pendaftaran Unit Massal (Batch)</h3>
                  <span className="text-[11px] text-bayan-300">
                    Otomatisasi kode berurutan (misal: POL-001 s/d POL-010)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Produk Terkait */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Pilih Busana Adat *
                </label>
                <select
                  value={batchProductId}
                  onChange={(e) => {
                    setBatchProductId(e.target.value);
                    const sel = products.find((p) => p.product_id === e.target.value);
                    if (sel) setBatchPrefix(sel.kode_produk);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-bayan-500"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.nama_produk} ({p.kode_produk})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Prefix Kode */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Prefix Kode *
                  </label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                    placeholder="POL"
                    required
                    maxLength={6}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase"
                  />
                </div>

                {/* Nomor Awal */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Mulai Nomor *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchStartNum}
                    onChange={(e) => setBatchStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                {/* Jumlah Unit */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Jumlah Unit *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Pratinjau Kode yang Akan Dihasilkan */}
              <div className="p-3.5 rounded-xl bg-bayan-50 border border-bayan-200 text-bayan-950 text-xs">
                <span className="font-bold block mb-1">Pratinjau Kode Barcode:</span>
                <span className="font-mono text-bayan-800 font-extrabold text-sm">
                  {batchPrefix}-{String(batchStartNum).padStart(3, "0")}
                </span>
                <span className="mx-2 text-slate-400">s/d</span>
                <span className="font-mono text-bayan-800 font-extrabold text-sm">
                  {batchPrefix}-{String(batchStartNum + Number(batchCount) - 1).padStart(3, "0")}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1">
                  ({batchCount} unit berstatus <strong>TERSEDIA</strong> dengan kondisi <strong>BAIK</strong>)
                </span>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Keterangan Batch
                </label>
                <input
                  type="text"
                  value={batchKeterangan}
                  onChange={(e) => setBatchKeterangan(e.target.value)}
                  placeholder="Keterangan pengadaan, tanggal masuk, dll..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bayan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-900/20 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate {batchCount} Unit Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: UBAH STATUS & KONDISI UNIT                                  */}
      {/* ==================================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="bg-bayan-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-bayan-gold" />
                <div>
                  <h3 className="font-serif font-bold text-base">Ubah Status & Kondisi Unit</h3>
                  <span className="text-[11px] text-bayan-300">
                    Unit Barcode: <strong className="text-white font-mono">{editKodeBarang}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Status 6 Tingkat */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Status Ketersediaan *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-bayan-500"
                >
                  <option value="TERSEDIA">TERSEDIA (Siap Sewa di Pos)</option>
                  <option value="DISEWA">DISEWA (Sedang Digunakan Pengunjung)</option>
                  <option value="DITAHAN">DITAHAN (Booking Sementara)</option>
                  <option value="PERAWATAN">PERAWATAN (Sedang Dicuci / Dibersihkan)</option>
                  <option value="RUSAK">RUSAK (Sobek / Perlu Jahit)</option>
                  <option value="HILANG">HILANG</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Pakaian selesai cuci dapat dikembalikan ke status <strong>TERSEDIA</strong>
                </span>
              </div>

              {/* Kondisi Fisik */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Kondisi Fisik Barang *
                </label>
                <select
                  value={editKondisi}
                  onChange={(e) => setEditKondisi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-bayan-500"
                >
                  <option value="BAIK">BAIK (Mulus, Tidak Ada Cacat)</option>
                  <option value="CUKUP">CUKUP (Sedikit Kusam / Pemakaian Normal)</option>
                  <option value="PERLU_PERBAIKAN">PERLU PERBAIKAN (Sobek / Luntur)</option>
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Catatan Petugas
                </label>
                <textarea
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  rows={2}
                  placeholder="Catatan kebersihan, perbaikan jahitan, dll..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bayan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-900/20 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
