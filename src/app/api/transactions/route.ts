/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Manajemen Transaksi Sewa (Daftar & Pembuatan Baru)
 * Endpoint: GET, POST /api/transactions
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse, Transaction } from "@/types";

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
    const search = searchParams.get("search") || "";
    const status_transaksi = searchParams.get("status_transaksi") || "ALL";
    const status_pembayaran = searchParams.get("status_pembayaran") || "ALL";
    const start_date = searchParams.get("start_date") || "";
    const end_date = searchParams.get("end_date") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const gasResponse = await callGasApi("transaction:list", {
      filters: {
        search,
        status_transaksi,
        status_pembayaran,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
      },
      limit,
      offset,
    });

    if (gasResponse.success && gasResponse.data) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Daftar transaksi sewa berhasil dimuat.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data transaksi standby.",
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
        message: `Terjadi kesalahan saat memuat transaksi: ${err.message}`,
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
    const { visit_id, items } = body;

    if (!visit_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "visit_id (ID Kunjungan) wajib disertakan.",
          data: null,
          errors: ["Bad Request: Missing visit_id"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Daftar unit busana adat (items) minimal 1 unit.",
          data: null,
          errors: ["Bad Request: Empty items"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validasi tiap item harus punya inventory_id
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
      visit_id,
      items,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("transaction:create", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal membuat transaksi penyewaan.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Transaksi penyewaan berhasil dibuat.",
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
