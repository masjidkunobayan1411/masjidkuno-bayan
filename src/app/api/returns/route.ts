/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Manajemen Pengembalian Pakaian Adat
 * Endpoint: GET, POST /api/returns
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

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
    const mode = searchParams.get("mode") || "active";
    const search = searchParams.get("search") || "";
    const kondisi = searchParams.get("kondisi") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Mode 1: Riwayat Pengembalian (History)
    if (mode === "history") {
      const gasResponse = await callGasApi("return:list", {
        filters: {
          search: search || undefined,
          kondisi: kondisi !== "ALL" ? kondisi : undefined,
          status: status !== "ALL" ? status : undefined,
        },
        limit,
        offset,
      });

      if (gasResponse.success && gasResponse.data) {
        return NextResponse.json<ApiResponse<any>>({
          success: true,
          message: "Riwayat pengembalian barang berhasil dimuat.",
          data: gasResponse.data,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Riwayat pengembalian standby.",
        data: { items: [], total: 0, limit, offset },
        timestamp: new Date().toISOString(),
      });
    }

    // Mode 2: Penyewaan Aktif yang Belum Selesai Dikembalikan (Active Rentals)
    const gasResponse = await callGasApi("return:active_rentals", {
      filters: { search: search || undefined },
    });

    if (gasResponse.success && gasResponse.data) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Daftar penyewaan aktif berhasil dimuat.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data penyewaan aktif standby.",
      data: [],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat data pengembalian: ${err.message}`,
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
    const { transaction_id, items } = body;

    if (!transaction_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "transaction_id wajib disertakan.",
          data: null,
          errors: ["Bad Request: Missing transaction_id"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Daftar unit barang yang dikembalikan (items) minimal 1 unit.",
          data: null,
          errors: ["Bad Request: Empty items"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validasi setiap item memiliki inventory_id
    for (let i = 0; i < items.length; i++) {
      if (!items[i].inventory_id) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: `Barang ke-${i + 1} tidak memiliki inventory_id yang valid.`,
            data: null,
            errors: ["Bad Request: Missing inventory_id"],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    const payload = {
      transaction_id,
      items,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("return:process", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal memproses pengembalian barang.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Pengembalian pakaian adat berhasil diproses dan status unit telah diperbarui.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan internal saat memproses pengembalian: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
