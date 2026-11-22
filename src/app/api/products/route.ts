/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Manajemen Katalog Produk Pakaian Adat
 * Endpoint: GET, POST /api/products
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse, Product } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Sesi tidak aktif atau telah kedaluwarsa.",
          data: null,
          errors: ["Unauthorized"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const kategori = searchParams.get("kategori") || "";

    const gasResponse = await callGasApi<Product[]>("product:list", {
      filters: { status, kategori },
    });

    if (gasResponse.success && gasResponse.data) {
      return NextResponse.json<ApiResponse<Product[]>>({
        success: true,
        message: "Daftar produk berhasil dimuat.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback Data Standar jika database baru diinisialisasi
    const fallbackProducts: Product[] = [
      {
        product_id: "PRD-POL",
        kode_produk: "POL",
        nama_produk: "Kain Poleng Sasak Bayan",
        kategori: "PAKAIAN_ADAT_WAJIB",
        harga_sewa: 20000,
        satuan: "unit/kunjungan",
        deskripsi: "Kain tenun bermotif kotak hitam-putih khas Bayan melambangkan keseimbangan kosmis.",
        status: "AKTIF",
        dibuat_pada: new Date().toISOString(),
        diperbarui_pada: new Date().toISOString(),
        stok: {
          total_unit: 0,
          tersedia: 0,
          disewa: 0,
          ditahan: 0,
          perawatan: 0,
          rusak: 0,
          hilang: 0,
        },
      },
      {
        product_id: "PRD-BAT",
        kode_produk: "BAT",
        nama_produk: "Kain Batik Sasak Lombok",
        kategori: "PAKAIAN_ADAT_PELENGKAP",
        harga_sewa: 10000,
        satuan: "unit/kunjungan",
        deskripsi: "Kain motif batik Sasak penutup bawahan atau selendang bahu pengunjung.",
        status: "AKTIF",
        dibuat_pada: new Date().toISOString(),
        diperbarui_pada: new Date().toISOString(),
        stok: {
          total_unit: 0,
          tersedia: 0,
          disewa: 0,
          ditahan: 0,
          perawatan: 0,
          rusak: 0,
          hilang: 0,
        },
      },
    ];

    return NextResponse.json<ApiResponse<Product[]>>({
      success: true,
      message: "Katalog produk awal (mode siap siaga).",
      data: fallbackProducts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat katalog produk: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Sesi tidak aktif atau telah kedaluwarsa.",
          data: null,
          errors: ["Unauthorized"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Pembatasan Hak Akses: Hanya SUPER_ADMIN yang dapat menambah produk
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Hanya Super Admin yang memiliki hak menambah produk baru.",
          data: null,
          errors: ["Forbidden: Role tidak mencukupi"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { kode_produk, nama_produk, kategori, harga_sewa, satuan, deskripsi } = body;

    if (!kode_produk || !nama_produk || harga_sewa === undefined) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Kode produk, nama produk, dan harga sewa wajib diisi.",
          data: null,
          errors: ["Parameter belum lengkap"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const payload = {
      kode_produk: String(kode_produk).trim().toUpperCase(),
      nama_produk: String(nama_produk).trim(),
      kategori: String(kategori || "PAKAIAN_ADAT").trim().toUpperCase(),
      harga_sewa: Number(harga_sewa),
      satuan: String(satuan || "unit/kunjungan").trim(),
      deskripsi: String(deskripsi || "-").trim(),
      status: "AKTIF",
      admin_role: user.role,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("product:create", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal menambahkan produk ke database.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Produk pakaian adat berhasil ditambahkan.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan internal: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
