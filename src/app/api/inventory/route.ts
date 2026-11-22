/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Manajemen Unit Fisik Inventaris (Koleksi & Pendaftaran)
 * Endpoint: GET, POST /api/inventory
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse, InventoryItem } from "@/types";

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
    const product_id = searchParams.get("product_id") || "";
    const status = searchParams.get("status") || "ALL";
    const kondisi = searchParams.get("kondisi") || "ALL";
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const gasResponse = await callGasApi("inventory:list", {
      filters: { product_id, status, kondisi, search },
      limit,
      offset,
    });

    if (gasResponse.success && gasResponse.data) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Data inventaris berhasil dimuat.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback Data Standar jika database inventaris masih kosong
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data inventaris (standby).",
      data: {
        items: [],
        total: 0,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat inventaris: ${err.message}`,
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

    const body = await request.json();

    // Mode 1: Pendaftaran Massal (Batch Create)
    if (body.is_batch) {
      const { product_id, prefix_kode, jumlah, mulai_nomor, keterangan } = body;

      if (!product_id || !prefix_kode || !jumlah) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: "Parameter batch tidak lengkap (product_id, prefix_kode, jumlah wajib diisi).",
            data: null,
            errors: ["Bad Request"],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      const payload = {
        product_id,
        prefix_kode: String(prefix_kode).trim().toUpperCase(),
        jumlah: Number(jumlah),
        mulai_nomor: Number(mulai_nomor || 1),
        keterangan: String(keterangan || "Pendaftaran batch").trim(),
        admin_role: user.role,
        admin_id: user.admin_id,
      };

      const gasResponse = await callGasApi("inventory:batch_create", payload);

      if (!gasResponse.success) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: gasResponse.message || "Gagal membuat unit inventaris massal.",
            data: null,
            errors: gasResponse.errors || [],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Unit fisik inventaris berhasil didaftarkan secara massal.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    // Mode 2: Pendaftaran Unit Tunggal
    const { product_id, kode_barang, kondisi, status, keterangan } = body;

    if (!product_id || !kode_barang) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "product_id dan kode_barang wajib diisi.",
          data: null,
          errors: ["Parameter belum lengkap"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const payload = {
      product_id,
      kode_barang: String(kode_barang).trim().toUpperCase(),
      kondisi: String(kondisi || "BAIK").toUpperCase().trim(),
      status: String(status || "TERSEDIA").toUpperCase().trim(),
      keterangan: String(keterangan || "-").trim(),
      admin_role: user.role,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("inventory:create", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal mendaftarkan unit inventaris.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Unit fisik inventaris berhasil didaftarkan.",
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
