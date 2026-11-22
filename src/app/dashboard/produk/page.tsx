"use client";

import React, { useState, useEffect } from "react";
import {
  Shirt,
  Plus,
  Search,
  Filter,
  Edit3,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  Info,
  DollarSign,
  Layers,
  X,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Product, SessionUser } from "@/types";

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // State Modal Tambah / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form Fields
  const [productId, setProductId] = useState("");
  const [kodeProduk, setKodeProduk] = useState("");
  const [namaProduk, setNamaProduk] = useState("");
  const [kategori, setKategori] = useState("PAKAIAN_ADAT_WAJIB");
  const [hargaSewa, setHargaSewa] = useState(20000);
  const [satuan, setSatuan] = useState("unit/kunjungan");
  const [deskripsi, setDeskripsi] = useState("");
  const [status, setStatus] = useState("AKTIF");

  // 1. Ambil Sesi Petugas Aktif
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCurrentUser(json.data);
        }
      })
      .catch((err) => console.error("Gagal memuat profil admin:", err));
  }, []);

  // 2. Ambil Daftar Produk
  const fetchProducts = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/products?status=${statusFilter}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setProducts(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat data produk:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  // Buka Modal Tambah Produk
  const handleOpenAdd = () => {
    setIsEditing(false);
    setProductId("");
    setKodeProduk("");
    setNamaProduk("");
    setKategori("PAKAIAN_ADAT_WAJIB");
    setHargaSewa(20000);
    setSatuan("unit/kunjungan");
    setDeskripsi("");
    setStatus("AKTIF");
    setFormError("");
    setModalOpen(true);
  };

  // Buka Modal Edit Produk
  const handleOpenEdit = (prd: Product) => {
    setIsEditing(true);
    setProductId(prd.product_id);
    setKodeProduk(prd.kode_produk);
    setNamaProduk(prd.nama_produk);
    setKategori(prd.kategori || "PAKAIAN_ADAT");
    setHargaSewa(prd.harga_sewa || 0);
    setSatuan(prd.satuan || "unit/kunjungan");
    setDeskripsi(prd.deskripsi || "");
    setStatus(prd.status || "AKTIF");
    setFormError("");
    setModalOpen(true);
  };

  // Simpan Form (POST / PUT)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const payload = {
        kode_produk: kodeProduk,
        nama_produk: namaProduk,
        kategori,
        harga_sewa: Number(hargaSewa),
        satuan,
        deskripsi,
        status,
      };

      const url = isEditing ? `/api/products/${productId}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.message || "Gagal menyimpan data produk.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        isEditing
          ? "Tarif dan data produk berhasil diperbarui."
          : "Produk pakaian adat baru berhasil ditambahkan."
      );
      setModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setFormError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Aktif / Nonaktif
  const handleToggleStatus = async (prd: Product) => {
    if (!isSuperAdmin) return;
    const newStatus = prd.status === "AKTIF" ? "NONAKTIF" : "AKTIF";
    const confirmText =
      newStatus === "NONAKTIF"
        ? `Yakin ingin menonaktifkan produk [${prd.nama_produk}]? Produk tidak akan muncul di opsi sewa kasir.`
        : `Aktifkan kembali produk [${prd.nama_produk}]?`;

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/products/${prd.product_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prd,
          status: newStatus,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Status produk berhasil diubah menjadi ${newStatus}.`);
        fetchProducts();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        alert(json.message || "Gagal mengubah status produk.");
      }
    } catch (err) {
      alert("Gagal menghubungi server.");
    }
  };

  // Filter Search
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      p.nama_produk.toLowerCase().includes(q) ||
      p.kode_produk.toLowerCase().includes(q) ||
      (p.kategori && p.kategori.toLowerCase().includes(q));

    if (statusFilter === "ALL") return matchSearch;
    return matchSearch && p.status === statusFilter;
  });

  const totalProduk = products.length;
  const totalAktif = products.filter((p) => p.status === "AKTIF").length;
  const totalUnit = products.reduce((acc, p) => acc + (p.stok?.total_unit || 0), 0);
  const totalTersedia = products.reduce((acc, p) => acc + (p.stok?.tersedia || 0), 0);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center shadow-sm">
              <Shirt className="w-5 h-5" />
            </div>
            <span>Katalog Pakaian Adat & Tarif Sewa</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola ragam busana adat, penyesuaian tarif sewa fleksibel, dan ketersediaan stok fisik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchProducts(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
            title="Segarkan Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-bayan-700 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-950/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-bayan-gold" />
              <span>Tambah Busana Adat</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifikasi Sukses */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Info Wewenang Hak Akses bagi Regular Admin */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs shadow-xs">
          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Akses Terbatas (Peran Admin):</span> Anda memiliki wewenang melihat katalog dan stok fisik. Penambahan produk baru atau perubahan tarif sewa hanya dapat dilakukan oleh akun dengan peran <strong>SUPER_ADMIN</strong>.
          </div>
        </div>
      )}

      {/* Grid Kartu Ringkasan Metrik Produk */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
            Total Jenis Produk
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {totalProduk}
            </span>
            <span className="text-xs text-slate-500">Kategori</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
            Produk Status Aktif
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
              {totalAktif}
            </span>
            <span className="text-xs text-slate-500">Siap Disewakan</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
            Total Unit Fisik
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {totalUnit}
            </span>
            <span className="text-xs text-slate-500">Lembar Pakaian</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
            Unit Siap Sewa
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-bayan-800 font-mono">
              {totalTersedia}
            </span>
            <span className="text-xs text-slate-500">Tersedia di Pos</span>
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input Pencarian */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama busana, kode (POL, BAT)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-bayan-500 text-xs bg-slate-50/50 hover:bg-white focus:bg-white"
          />
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-bayan-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="AKTIF">Hanya Aktif</option>
            <option value="NONAKTIF">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Daftar Produk (Tabel Responsif & Cards) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-bayan-700 mx-auto mb-2" />
            <p className="text-xs font-semibold">Memuat katalog pakaian adat...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Shirt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Tidak ada produk yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter status Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Kode</th>
                  <th className="py-3.5 px-4">Nama Pakaian Adat</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Tarif Sewa</th>
                  <th className="py-3.5 px-4">Stok Fisik</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isSuperAdmin && <th className="py-3.5 px-4 text-right">Aksi Super Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prd) => (
                  <tr key={prd.product_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Kode Produk */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-bayan-100 text-bayan-900 border border-bayan-200">
                        {prd.kode_produk}
                      </span>
                    </td>

                    {/* Nama & Deskripsi */}
                    <td className="py-4 px-4 min-w-[200px]">
                      <span className="font-bold text-slate-900 text-sm block">
                        {prd.nama_produk}
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5 line-clamp-1">
                        {prd.deskripsi || "-"}
                      </span>
                    </td>

                    {/* Kategori */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-slate-700 font-medium capitalize">
                        {prd.kategori?.replace(/_/g, " ").toLowerCase() || "Pakaian Adat"}
                      </span>
                    </td>

                    {/* Tarif Sewa */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-sm block">
                        {formatRupiah(prd.harga_sewa)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        / {prd.satuan || "unit/kunjungan"}
                      </span>
                    </td>

                    {/* Ringkasan Stok Fisik */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {prd.stok?.tersedia || 0} Tersedia
                        </span>
                        {(prd.stok?.disewa || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {prd.stok?.disewa} Disewa
                          </span>
                        )}
                        {(prd.stok?.perawatan || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            {prd.stok?.perawatan} Rawat
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Total: {prd.stok?.total_unit || 0} Unit
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          prd.status === "AKTIF"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prd.status === "AKTIF" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{prd.status}</span>
                      </span>
                    </td>

                    {/* Aksi Super Admin */}
                    {isSuperAdmin && (
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(prd)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-bayan-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                            title="Ubah Tarif & Data"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prd)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              prd.status === "AKTIF"
                                ? "text-red-600 hover:bg-red-50 border-red-200"
                                : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                            }`}
                            title={prd.status === "AKTIF" ? "Nonaktifkan Produk" : "Aktifkan Produk"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Card: Edukasi Snapshot Pricing */}
        <div className="bg-slate-50/90 p-4 border-t border-slate-200 flex items-start gap-2.5 text-slate-500 text-xs">
          <Info className="w-4 h-4 text-bayan-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Kepatuhan Aturan Bisnis E.3 (Snapshot Pricing):</strong> Penyesuaian tarif sewa pada halaman ini bersifat dinamis untuk transaksi sewa baru, dan dijamin tidak akan pernah mengubah nilai nominal transaksi sewa lama yang telah tersimpan di database.
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL TAMBAH / UBAH PRODUK PAKAIAN ADAT                              */}
      {/* ==================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            {/* Header Modal */}
            <div className="bg-bayan-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center">
                  <Shirt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">
                    {isEditing ? "Ubah Tarif & Data Pakaian Adat" : "Tambah Pakaian Adat Baru"}
                  </h3>
                  <span className="text-[11px] text-bayan-300">
                    Katalog Resmi Masjid Kuno Bayan
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulir Modal */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Kode Produk */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kode Produk *
                  </label>
                  <input
                    type="text"
                    value={kodeProduk}
                    onChange={(e) => setKodeProduk(e.target.value.toUpperCase())}
                    placeholder="Contoh: POL"
                    disabled={isEditing || submitting}
                    required
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-bayan-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Alfanumerik (2-10 karakter)
                  </span>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status Produk *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-bayan-500 bg-white"
                  >
                    <option value="AKTIF">AKTIF (Bisa Disewa)</option>
                    <option value="NONAKTIF">NONAKTIF (Ditutup)</option>
                  </select>
                </div>
              </div>

              {/* Nama Produk */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Pakaian Adat *
                </label>
                <input
                  type="text"
                  value={namaProduk}
                  onChange={(e) => setNamaProduk(e.target.value)}
                  placeholder="Contoh: Kain Poleng Sasak Bayan"
                  disabled={submitting}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bayan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tarif Sewa */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tarif Sewa (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={hargaSewa}
                    onChange={(e) => setHargaSewa(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={submitting}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-bayan-500"
                  />
                </div>

                {/* Satuan */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Satuan *
                  </label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="unit/kunjungan"
                    disabled={submitting}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bayan-500"
                  />
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Kategori Busana *
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-bayan-500 bg-white"
                >
                  <option value="PAKAIAN_ADAT_WAJIB">Pakaian Adat Wajib (Kain Poleng/Dodot)</option>
                  <option value="PAKAIAN_ADAT_PELENGKAP">Pakaian Adat Pelengkap (Batik Sasak)</option>
                  <option value="AKSESORIS">Aksesoris (Sapuk Ikat Kepala / Jong)</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Deskripsi & Nilai Budaya
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Keterangan bahan kain, corak, dan filosofi adat..."
                  rows={2}
                  disabled={submitting}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bayan-500"
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-900/20 transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditing ? "Simpan Perubahan" : "Tambahkan Produk"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
