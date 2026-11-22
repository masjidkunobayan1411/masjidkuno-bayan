"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Search,
  UserCheck,
  Shirt,
  Barcode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ShieldAlert,
  Clock,
  Sparkles,
} from "lucide-react";
import { Product, InventoryItem, EnrichedVisit } from "@/types";

export default function NewTransactionPage() {
  const router = useRouter();

  // Data Masters
  const [products, setProducts] = useState<Product[]>([]);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [visits, setVisits] = useState<EnrichedVisit[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Step 1: Visit Selection
  const [selectedVisit, setSelectedVisit] = useState<EnrichedVisit | null>(null);
  const [visitSearchQuery, setVisitSearchQuery] = useState("");
  const [searchingVisit, setSearchingVisit] = useState(false);

  // Step 2: Item Selection
  const [selectedProductId, setSelectedProductId] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cartItems, setCartItems] = useState<InventoryItem[]>([]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [itemError, setItemError] = useState("");

  // 1. Muat Produk & Unit Inventaris Tersedia
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, invRes, visitRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/inventory?status=TERSEDIA&limit=200"),
          fetch("/api/visits?limit=20"),
        ]);

        const prodJson = await prodRes.json();
        const invJson = await invRes.json();
        const visitJson = await visitRes.json();

        if (prodJson.success && prodJson.data) {
          setProducts(prodJson.data);
          if (prodJson.data.length > 0) {
            setSelectedProductId(prodJson.data[0].product_id);
          }
        }

        if (invJson.success && invJson.data) {
          setAvailableItems(invJson.data.items || []);
        }

        if (visitJson.success && visitJson.data) {
          setVisits(visitJson.data.items || []);
        }
      } catch (err: any) {
        console.error("Gagal memuat data awal:", err);
        setPageError("Gagal memuat master data inventaris.");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Filter unit tersedia berdasarkan produk yang dipilih
  const filteredAvailableUnits = availableItems.filter(
    (item) =>
      (!selectedProductId || item.product_id === selectedProductId) &&
      !cartItems.some((cart) => cart.inventory_id === item.inventory_id)
  );

  // Cari Kunjungan berdasarkan ID atau Nama
  const handleSearchVisit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!visitSearchQuery.trim()) return;

    setSearchingVisit(true);
    setPageError("");
    try {
      const res = await fetch(`/api/visits?search=${encodeURIComponent(visitSearchQuery.trim())}`);
      const json = await res.json();
      if (res.ok && json.success && json.data?.items?.length > 0) {
        setSelectedVisit(json.data.items[0]);
      } else {
        // Coba cari langsung ke tiket tunggal
        const singleRes = await fetch(`/api/public/ticket/${visitSearchQuery.trim().toUpperCase()}`);
        const singleJson = await singleRes.json();
        if (singleRes.ok && singleJson.success && singleJson.data) {
          const raw = singleJson.data;
          const v = raw.visitor || {};
          setSelectedVisit({
            ...raw,
            nama_pengunjung: raw.nama_pengunjung || v.nama_pengunjung || v.nama_lengkap || "Pengunjung Terdaftar",
            jenis_pengunjung: raw.jenis_pengunjung || v.jenis_pengunjung || "DOMESTIK",
            kabupaten_kota: raw.kabupaten_kota || v.kabupaten_kota || "",
            provinsi: raw.provinsi || v.provinsi || "",
            negara: raw.negara || v.negara || "",
            asal: raw.asal || (
              (raw.jenis_pengunjung || v.jenis_pengunjung) === "DOMESTIK"
                ? [raw.kabupaten_kota || v.kabupaten_kota, raw.provinsi || v.provinsi || "Indonesia"].filter(Boolean).join(", ")
                : raw.negara || v.negara || "Mancanegara"
            ),
          });
        } else {
          setPageError(`Kunjungan [${visitSearchQuery.toUpperCase()}] tidak ditemukan.`);
        }
      }
    } catch (err) {
      setPageError("Gagal mencari data kunjungan.");
    } finally {
      setSearchingVisit(false);
    }
  };

  // Tambahkan Unit ke Keranjang via Barcode / Dropdown
  const handleAddItemToCart = (itemToAdd: InventoryItem) => {
    setItemError("");

    // Periksa duplikasi
    if (cartItems.some((item) => item.inventory_id === itemToAdd.inventory_id)) {
      setItemError(`Unit [${itemToAdd.kode_barang}] sudah ada di keranjang sewa.`);
      return;
    }

    // Lengkapi data produk jika belum ada
    const prod = products.find((p) => p.product_id === itemToAdd.product_id);
    const enrichedItem: InventoryItem = {
      ...itemToAdd,
      nama_produk: prod?.nama_produk || itemToAdd.nama_produk || "Busana Adat",
      harga_sewa: prod?.harga_sewa || itemToAdd.harga_sewa || 0,
    };

    setCartItems([...cartItems, enrichedItem]);
    setBarcodeInput("");
  };

  // Tambah melalui Barcode Input (Scanner / Ketik)
  const handleBarcodeInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setItemError("");

    const code = barcodeInput.trim().toUpperCase();
    if (!code) return;

    const found = availableItems.find(
      (item) => item.kode_barang.toUpperCase() === code
    );

    if (!found) {
      setItemError(
        `Unit dengan barcode [${code}] tidak ditemukan atau saat ini TIDAK berstatus TERSEDIA.`
      );
      return;
    }

    handleAddItemToCart(found);
  };

  // Hapus Unit dari Keranjang
  const handleRemoveFromCart = (inventoryId: string) => {
    setCartItems(cartItems.filter((item) => item.inventory_id !== inventoryId));
  };

  // Hitung Total Tagihan
  const totalBiaya = cartItems.reduce(
    (sum, item) => sum + Number(item.harga_sewa || 0),
    0
  );

  // Submit Transaksi Baru
  const handleSubmitTransaction = async () => {
    setPageError("");

    if (!selectedVisit) {
      setPageError("Wajib memilih sesi kunjungan pengunjung terlebih dahulu.");
      return;
    }

    if (cartItems.length === 0) {
      setPageError("Pilih minimal 1 unit pakaian adat untuk disewa.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        visit_id: selectedVisit.visit_id,
        items: cartItems.map((c) => ({
          inventory_id: c.inventory_id,
        })),
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setPageError(json.message || "Gagal membuat transaksi sewa.");
        setSubmitting(false);
        return;
      }

      const trxId = json.data?.transaction?.transaction_id;
      if (trxId) {
        router.push(`/dashboard/transaksi/${trxId}`);
      } else {
        router.push("/dashboard/transaksi");
      }
    } catch (err: any) {
      setPageError("Terjadi gangguan jaringan atau server tidak merespons.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb & Header Navigasi */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/transaksi"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Transaksi</span>
        </Link>
        <span className="text-xs font-medium text-slate-400">
          Kasir Pelayanan Masjid Kuno Bayan
        </span>
      </div>

      {/* Judul Halaman */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-bayan-800 text-bayan-gold flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <span>Pembuatan Transaksi Sewa Baru</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hubungkan sesi tiket kunjungan pengunjung dengan unit pakaian adat berstatus TERSEDIA.
          </p>
        </div>
      </div>

      {/* Pesan Kesalahan Global */}
      {pageError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs shadow-xs animate-shake">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Peringatan Transaksi:</span>
            <span>{pageError}</span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LANGKAH 1: HUBUNGKAN KE SESI KUNJUNGAN PENGUNJUNG                    */}
      {/* ==================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm">
            <div className="w-6 h-6 rounded-full bg-bayan-100 text-bayan-800 text-xs font-mono font-bold flex items-center justify-center">
              1
            </div>
            <span>Pilih Sesi Kunjungan Pengunjung</span>
          </div>
          {selectedVisit && (
            <button
              type="button"
              onClick={() => setSelectedVisit(null)}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              Ganti Kunjungan
            </button>
          )}
        </div>

        {!selectedVisit ? (
          <div className="space-y-4">
            {/* Input Pencarian Kunjungan */}
            <form onSubmit={handleSearchVisit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={visitSearchQuery}
                  onChange={(e) => setVisitSearchQuery(e.target.value)}
                  placeholder="Ketik Nomor Tiket (misal: VST-2026-0001) atau Nama Pengunjung..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-bayan-500 uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={searchingVisit || !visitSearchQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {searchingVisit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Cari Tiket</span>
              </button>
            </form>

            {/* Pilihan Cepat dari Kunjungan Terdaftar Hari Ini */}
            {visits.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Atau Pilih Dari Kunjungan Terdaftar Terkini:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {visits.slice(0, 6).map((v) => (
                    <div
                      key={v.visit_id}
                      onClick={() => setSelectedVisit(v)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-bayan-500 hover:bg-bayan-50/50 cursor-pointer transition-all flex items-center justify-between text-xs group"
                    >
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-bayan-900">
                          {v.nama_pengunjung || "Pengunjung"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {v.visit_id} • {v.total_pengunjung} orang
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Pilih
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Kartu Rincian Kunjungan Terpilih */
          <div className="p-4 rounded-2xl bg-bayan-50/70 border border-bayan-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-bayan-800 text-bayan-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedVisit.nama_pengunjung || selectedVisit.visitor?.nama_pengunjung || "Nama Pengunjung"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-bayan-200 text-bayan-900 text-[10px] font-bold">
                    {selectedVisit.jenis_pengunjung || selectedVisit.visitor?.jenis_pengunjung || "DOMESTIK"}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5 font-mono">
                  No. Tiket: <strong>{selectedVisit.visit_id}</strong>
                </div>
                <div className="text-slate-600 text-[11px] mt-0.5">
                  Asal: {selectedVisit.asal || selectedVisit.kabupaten_kota || selectedVisit.visitor?.kabupaten_kota || selectedVisit.provinsi || selectedVisit.visitor?.provinsi || selectedVisit.negara || selectedVisit.visitor?.negara || "-"} • Rombongan: {selectedVisit.total_pengunjung} Orang ({selectedVisit.jumlah_dewasa} Dewasa, {selectedVisit.jumlah_anak} Anak)
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-bayan-200/60">
              <span className="text-[10px] text-slate-500">Status Kunjungan</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                {selectedVisit.status_kunjungan}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* LANGKAH 2: PILIH UNIT FISIK PAKAIAN ADAT (TERSEDIA)                  */}
      {/* ==================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm pb-3 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-bayan-100 text-bayan-800 text-xs font-mono font-bold flex items-center justify-center">
            2
          </div>
          <span>Pilih Unit Pakaian Adat (Status: TERSEDIA)</span>
        </div>

        {itemError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{itemError}</span>
          </div>
        )}

        {/* Input Barcode Scanner & Pilihan Manual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metode A: Scan Barcode */}
          <form onSubmit={handleBarcodeInputSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-bayan-700" />
              <span>Metode A: Scan / Input Barcode</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                placeholder="Contoh: POL-001..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-bayan-500 bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                + Tambah
              </button>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Gunakan barcode scanner atau ketik nomor unit yang tertera di label baju.
            </span>
          </form>

          {/* Metode B: Pilih Dari Unit Tersedia */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Shirt className="w-4 h-4 text-bayan-700" />
              <span>Metode B: Pilih Unit Tersedia</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
              >
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.nama_produk}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) => {
                  const unit = filteredAvailableUnits.find(
                    (u) => u.inventory_id === e.target.value
                  );
                  if (unit) handleAddItemToCart(unit);
                  e.target.value = "";
                }}
                defaultValue=""
                className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white text-bayan-900"
              >
                <option value="" disabled>
                  Pilih Unit ({filteredAvailableUnits.length} Ready)
                </option>
                {filteredAvailableUnits.map((u) => (
                  <option key={u.inventory_id} value={u.inventory_id}>
                    {u.kode_barang} ({u.kondisi})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Hanya menampilkan unit fisik pakaian yang siap sewa dan bersih.
            </span>
          </div>
        </div>

        {/* Tabel Keranjang Sewa */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden mt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4 w-12 text-center">No</th>
                <th className="py-2.5 px-4">Kode Barcode Unit</th>
                <th className="py-2.5 px-4">Busana Adat</th>
                <th className="py-2.5 px-4 text-center">Kondisi</th>
                <th className="py-2.5 px-4 text-right">Harga Sewa (Snapshot)</th>
                <th className="py-2.5 px-4 text-center w-16">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cartItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Shirt className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    <span>Keranjang sewa masih kosong. Pilih unit di atas.</span>
                  </td>
                </tr>
              ) : (
                cartItems.map((item, idx) => (
                  <tr key={item.inventory_id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-bayan-900">
                      {item.kode_barang}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.nama_produk || "Busana Adat"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.kondisi || "BAIK"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rp{Number(item.harga_sewa || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.inventory_id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Hapus unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LANGKAH 3: RINGKASAN TAGIHAN & PEMBUATAN INVOICE                     */}
      {/* ==================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm pb-3 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-bayan-100 text-bayan-800 text-xs font-mono font-bold flex items-center justify-center">
            3
          </div>
          <span>Ringkasan Biaya & Snapshot Pricing</span>
        </div>

        {/* Penjelasan Snapshot Pricing */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-amber-900 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Prinsip Integritas Keuangan (Snapshot Pricing):</span>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              Harga sewa yang dikenakan akan dikunci permanen pada invoice transaksi ini sesuai tarif aktif saat ini.
              Perubahan harga katalog di masa mendatang tidak akan mengubah nilai transaksi ini.
            </p>
          </div>
        </div>

        {/* Ringkasan Angka */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-slate-500 text-xs font-semibold block">Total Busana Sewa</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {cartItems.length} Unit
            </span>
          </div>

          <div className="sm:text-right">
            <span className="text-slate-500 text-xs font-semibold block">Total Tagihan Sewa</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-bayan-800 font-mono">
              Rp{totalBiaya.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Tombol Simpan Transaksi */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/transaksi"
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="button"
            onClick={handleSubmitTransaction}
            disabled={submitting || !selectedVisit || cartItems.length === 0}
            className="px-6 py-2.5 rounded-xl bg-bayan-800 hover:bg-bayan-700 text-white text-xs font-bold shadow-md shadow-bayan-950/20 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin text-bayan-gold" />}
            <span>Simpan & Terbitkan Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
