/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Definisi Tipe Data TypeScript Terpadu
 * File: src/types/index.ts
 * ============================================================================
 */

// --- 1. ENUM & STATUS SISTEM ---
export type AdminRole = "SUPER_ADMIN" | "ADMIN";
export type AdminStatus = "AKTIF" | "NONAKTIF";
export type VisitorType = "DOMESTIK" | "MANCANEGARA";
export type VisitStatus = "TERDAFTAR" | "TERVERIFIKASI" | "CHECK-IN" | "SELESAI" | "BATAL";
export type ProductStatus = "AKTIF" | "NONAKTIF";
export type InventoryCondition = "BAIK" | "CUKUP" | "PERLU_PERBAIKAN";
export type InventoryStatus =
  | "TERSEDIA"
  | "DITAHAN"
  | "DISEWA"
  | "PERAWATAN"
  | "RUSAK"
  | "HILANG";

export type TransactionStatus = "DRAFT" | "DISEWA" | "SELESAI" | "DIBATALKAN";
export type PaymentStatus =
  | "BELUM_DIBAYAR"
  | "MENUNGGU_VERIFIKASI"
  | "LUNAS"
  | "BERHASIL"
  | "GAGAL"
  | "KEDALUWARSA";

export type PaymentMethod =
  | "TUNAI"
  | "QRIS"
  | "QRIS BAYANNESIA"
  | "QRIS BUMDES BAYAN";
export type ReturnCondition =
  | "BAIK"
  | "KOTOR_RINGAN"
  | "RUSAK_RINGAN"
  | "RUSAK_BERAT"
  | "HILANG";

export type ReturnStatus = "DITERIMA" | "PERLU_TINDAK_LANJUT" | "SELESAI";

// --- 2. ENTITAS DATABASE (11 SHEET) ---

export interface Admin {
  admin_id: string;
  nama: string;
  email: string;
  password_hash?: string;
  password_display?: string;
  role: AdminRole;
  status: AdminStatus;
  dibuat_pada: string;
  terakhir_login: string;
}

export interface Visitor {
  visitor_id: string;
  nama_pengunjung: string;
  jenis_pengunjung: VisitorType;
  negara: string;
  provinsi: string;
  kabupaten_kota: string;
  nomor_telepon?: string;
  asal_instansi: string;
  dibuat_pada: string;
}

export interface Visit {
  visit_id: string;
  visitor_id: string;
  tanggal_kunjungan: string;
  waktu_kunjungan: string;
  jumlah_dewasa: number;
  jumlah_anak: number;
  total_pengunjung: number;
  tujuan_kunjungan: string;
  bahasa: "ID" | "EN";
  persetujuan_data: boolean;
  status_kunjungan: VisitStatus;
}

export interface EnrichedVisit extends Visit {
  nama_pengunjung?: string;
  jenis_pengunjung?: VisitorType;
  negara?: string;
  provinsi?: string;
  kabupaten_kota?: string;
  nomor_telepon?: string;
  asal_instansi?: string;
  asal?: string;
  visitor?: any;
}

export interface Product {
  product_id: string;
  kode_produk: string;
  nama_produk: string;
  kategori: string;
  harga_sewa: number;
  satuan: string;
  deskripsi: string;
  status: ProductStatus;
  dibuat_pada: string;
  diperbarui_pada: string;
  stok?: {
    total_unit: number;
    tersedia: number;
    disewa: number;
    ditahan: number;
    perawatan: number;
    rusak: number;
    hilang: number;
  };
}

export interface InventoryItem {
  inventory_id: string;
  product_id: string;
  kode_barang: string;
  kondisi: InventoryCondition;
  status: InventoryStatus;
  tanggal_masuk: string;
  keterangan: string;
  nama_produk?: string;
  kode_produk?: string;
  harga_sewa?: number;
  satuan?: string;
}

export interface Transaction {
  transaction_id: string;
  visit_id: string;
  tanggal_transaksi: string;
  total_barang: number;
  total_harga: number;
  status_transaksi: TransactionStatus;
  status_pembayaran: PaymentStatus;
  petugas_id: string;
  nama_petugas?: string;
  metode_pembayaran?: string;
  jumlah_kain_poleng?: number;
  jumlah_kain_batik?: number;
  nama_pengunjung?: string;
  nominal_sewa?: number;
  dibuat_pada: string;
}

export interface EnrichedTransaction extends Transaction {
  details?: TransactionDetail[];
  payments?: Payment[];
  returns?: ReturnRecord[];
  visit?: Visit;
  visitor?: Visitor;
  nama_pengunjung?: string;
}

export interface TransactionDetail {
  detail_id: string;
  transaction_id: string;
  inventory_id: string;
  product_id: string;
  nama_produk_snapshot: string;
  harga_snapshot: number;
  jumlah: number;
  subtotal: number;
}

export interface Payment {
  payment_id: string;
  transaction_id: string;
  metode_pembayaran: PaymentMethod;
  jumlah_bayar: number;
  status_pembayaran: PaymentStatus;
  referensi_gateway: string;
  waktu_pembayaran: string;
  diverifikasi_oleh: string;
}

export interface ActiveRental extends Transaction {
  nama_pengunjung: string;
  nomor_telepon?: string;
  total_barang_disewa: number;
  total_barang_kembali: number;
  sisa_barang_kembali: number;
  pending_items: TransactionDetail[];
}

export interface ReturnRecord {
  return_id: string;
  transaction_id: string;
  inventory_id: string;
  waktu_pengembalian: string;
  kondisi_pengembalian: ReturnCondition;
  status_pengembalian: ReturnStatus;
  petugas_id: string;
  keterangan: string;
}

export interface ActivityLogEntry {
  log_id: string;
  admin_id: string;
  aktivitas: string;
  objek: string;
  objek_id: string;
  waktu: string;
  keterangan: string;
}

export interface SystemSetting {
  setting_id: string;
  nama_pengaturan: string;
  nilai: string;
  keterangan: string;
  diperbarui_pada: string;
}

// --- 3. STANDARD API RESPONSE ENVELOPE ---
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
  timestamp: string;
}

// --- 4. SESSION & AUTH TYPES ---
export interface SessionUser {
  admin_id: string;
  nama: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  terakhir_login?: string;
}

export interface SessionPayload {
  user: SessionUser;
  expiresAt: number; // timestamp
}
