/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Rekonsiliasi Transaksi Pending (DANA Query Payment)
 * Endpoint: POST /api/payment/reconcile
 * ============================================================================
 * 
 * Modul ini menangani rekonsiliasi manual atau berkala untuk transaksi yang
 * notifikasi webhook-nya terlambat atau belum sampai:
 * 1. Memanggil Query Payment API resmi DANA.
 * 2. Memperbarui status database ke Google Spreadsheet jika terbukti lunas.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { isDanaConfigured } from "@/lib/dana/config";
import { queryDanaPayment } from "@/lib/dana/dana-api";
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

    const body = await request.json().catch(() => ({}));
    const orderId = (body.order_id || body.transaction_id || "").trim();
    const externalId = (body.external_id || "").trim();

    if (!orderId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "order_id wajib disertakan untuk melakukan rekonsiliasi.",
          data: null,
          errors: ["Missing order_id"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (!isDanaConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Kredensial gateway DANA belum dikonfigurasi.",
          data: null,
          errors: ["DANA Not Configured"],
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // 1. Ambil data transaksi dari database
    const trxResponse = await callGasApi("transaction:get", { transaction_id: orderId });
    if (!trxResponse.success || !trxResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: `Transaksi [${orderId}] tidak ditemukan.`,
          data: null,
          errors: ["Transaction Not Found"],
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const trx = trxResponse.data;

    // 2. Jika transaksi sudah lunas di database, laporkan status
    if (trx.status_pembayaran === "LUNAS") {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: `Transaksi [${orderId}] sudah berstatus LUNAS sebelumnya.`,
        data: {
          order_id: orderId,
          status: "PAID",
          is_paid: true,
          reconciled: false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Panggil Query Payment API ke gateway resmi DANA
    const queryResult = await queryDanaPayment(orderId, externalId);

    // 4. Jika DANA mengonfirmasi pembayaran lunas, perbarui database
    if (queryResult.status === "PAID") {
      await callGasApi("payment:dana_webhook", {
        order_id: orderId,
        external_id: queryResult.externalId,
        dana_reference_no: queryResult.danaReferenceNo || "",
        amount: queryResult.amount,
        currency: "IDR",
        status: "PAID",
        paid_at: queryResult.paidAt || new Date().toISOString(),
        signature_valid: true,
        event_type: "RECONCILE_MANUAL",
      });

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: `Transaksi [${orderId}] berhasil direkonsiliasi dan disahkan LUNAS.`,
        data: {
          order_id: orderId,
          external_id: queryResult.externalId,
          dana_reference_no: queryResult.danaReferenceNo,
          amount: queryResult.amount,
          status: "PAID",
          is_paid: true,
          reconciled: true,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Kembalikan hasil rekonsiliasi jika belum lunas
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: `Hasil rekonsiliasi DANA: transaksi masih berstatus ${queryResult.status}`,
      data: {
        order_id: orderId,
        external_id: queryResult.externalId,
        status: queryResult.status,
        is_paid: false,
        reconciled: false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API RECONCILE ERROR]", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Gagal merekonsiliasi transaksi: ${error.message || error}`,
        data: null,
        errors: [error.message || "Internal Server Error"],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
