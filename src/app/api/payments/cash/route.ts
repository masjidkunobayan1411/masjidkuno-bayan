/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Pembayaran Tunai (Cash) Terverifikasi Kasir
 * Endpoint: POST /api/payments/cash
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

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
    const { transaction_id, jumlah_bayar } = body;

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

    const nominalBayar = Number(jumlah_bayar);
    if (isNaN(nominalBayar) || nominalBayar <= 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Jumlah bayar harus berupa nominal rupiah valid lebih dari 0.",
          data: null,
          errors: ["Bad Request: Invalid jumlah_bayar"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const payload = {
      transaction_id,
      jumlah_bayar: nominalBayar,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("payment:cash", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal memproses pembayaran tunai.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Pembayaran tunai berhasil diverifikasi dan transaksi telah lunas.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memproses pembayaran tunai: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
