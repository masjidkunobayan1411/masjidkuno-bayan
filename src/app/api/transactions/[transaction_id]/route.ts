/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Detail Transaksi, Invoice, dan Pembatalan
 * Endpoint: GET, DELETE /api/transactions/[transaction_id]
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { transaction_id: string } }
) {
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

    const transactionId = params.transaction_id;
    const gasResponse = await callGasApi("transaction:get", {
      transaction_id: transactionId,
    });

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Data transaksi tidak ditemukan.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Resolusi nama petugas kasir resmi (bukan hanya ID)
    if (gasResponse.data?.transaction) {
      const trx = gasResponse.data.transaction;
      if (!trx.nama_petugas || trx.nama_petugas === trx.petugas_id) {
        if (user.admin_id === trx.petugas_id && user.nama) {
          trx.nama_petugas = user.nama;
        } else {
          try {
            const adminListRes = await callGasApi("admin:list", {});
            const admins = (adminListRes.data?.items || adminListRes.data || []) as any[];
            const matchedAdmin = admins.find((a: any) => a.admin_id === trx.petugas_id);
            if (matchedAdmin?.nama) {
              trx.nama_petugas = matchedAdmin.nama;
            } else {
              trx.nama_petugas = user.nama || "Petugas Kasir";
            }
          } catch {
            trx.nama_petugas = user.nama || "Petugas Kasir";
          }
        }
      }
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Detail transaksi berhasil dimuat.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat detail transaksi: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { transaction_id: string } }
) {
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

    const transactionId = params.transaction_id;
    let alasan = "Dibatalkan oleh petugas";
    try {
      const body = await request.json();
      if (body && body.alasan) alasan = String(body.alasan).trim();
    } catch (e) {
      // Body opsional pada DELETE
    }

    const gasResponse = await callGasApi("transaction:cancel", {
      transaction_id: transactionId,
      alasan,
      admin_id: user.admin_id,
    });

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal membatalkan transaksi.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Transaksi berhasil dibatalkan dan unit inventaris telah dibebaskan.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat membatalkan transaksi: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
