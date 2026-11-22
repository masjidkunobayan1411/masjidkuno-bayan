/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Pengecekan Status Pembayaran DANA (Query Payment & Database)
 * Endpoint: GET /api/payment/status
 * ============================================================================
 * 
 * Modul ini menangani pengecekan status transaksi real-time:
 * 1. Memeriksa status dari database Google Spreadsheet terlebih dahulu.
 * 2. Jika masih PENDING dan gateway DANA aktif, melakukan rekonsiliasi real-time
 *    ke Query Payment API resmi DANA.
 * 3. Menghindari manipulasi status langsung dari sisi frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { callGasApi } from "@/lib/gas-client";
import { isDanaConfigured } from "@/lib/dana/config";
import { queryDanaPayment } from "@/lib/dana/dana-api";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = (searchParams.get("order_id") || searchParams.get("transaction_id") || "").trim();
    const externalId = (searchParams.get("external_id") || "").trim();

    if (!orderId && !externalId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Parameter order_id atau external_id wajib disertakan.",
          data: null,
          errors: ["Missing order_id or external_id"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 1. Baca status transaksi dari Google Spreadsheet
    const gasStatusResponse = await callGasApi("payment:dana_status", {
      order_id: orderId,
      external_id: externalId,
    });

    let currentStatus = "PENDING";
    let isPaid = false;
    let paymentData: any = null;

    if (gasStatusResponse.success && gasStatusResponse.data) {
      paymentData = gasStatusResponse.data;
      currentStatus = (paymentData.status || "PENDING").toUpperCase();
      isPaid = Boolean(paymentData.is_paid || currentStatus === "PAID" || currentStatus === "LUNAS");
    }

    // 2. Jika transaksi sudah lunas di database, segera kembalikan status LUNAS
    if (isPaid) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Transaksi telah terverifikasi LUNAS.",
        data: {
          order_id: orderId || paymentData?.order_id,
          external_id: externalId || paymentData?.external_id,
          amount: paymentData?.amount,
          status: "PAID",
          is_paid: true,
          paid_at: paymentData?.paid_at,
          source: "DATABASE",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Jika status masih PENDING dan kredensial DANA aktif, coba Query Payment langsung ke DANA
    if (isDanaConfigured() && orderId) {
      try {
        const queryResult = await queryDanaPayment(orderId, externalId || paymentData?.external_id || "");

        if (queryResult.status === "PAID") {
          // Sinkronkan status ke Google Spreadsheet secara atomik
          await callGasApi("payment:dana_webhook", {
            order_id: orderId,
            external_id: externalId || queryResult.externalId,
            dana_reference_no: queryResult.danaReferenceNo || "",
            amount: queryResult.amount,
            currency: "IDR",
            status: "PAID",
            paid_at: queryResult.paidAt || new Date().toISOString(),
            signature_valid: true,
            event_type: "QUERY_PAYMENT_SYNC",
          });

          return NextResponse.json<ApiResponse<any>>({
            success: true,
            message: "Transaksi berhasil diverifikasi LUNAS melalui Query Payment DANA.",
            data: {
              order_id: orderId,
              external_id: queryResult.externalId,
              amount: queryResult.amount,
              status: "PAID",
              is_paid: true,
              paid_at: queryResult.paidAt,
              source: "DANA_API_SYNC",
            },
            timestamp: new Date().toISOString(),
          });
        } else if (queryResult.status === "EXPIRED" || queryResult.status === "FAILED") {
          currentStatus = queryResult.status;
        }
      } catch (queryErr: any) {
        // Query Payment ke gateway DANA gagal (misal koneksi sandbox/key belum aktif), gunakan status lokal
        console.warn("[PAYMENT STATUS WARNING] Gagal query payment DANA:", queryErr.message || queryErr);
      }
    }

    // 4. Kembalikan status terkini (PENDING / EXPIRED / dsb)
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: `Status pembayaran: ${currentStatus}`,
      data: {
        order_id: orderId || paymentData?.order_id,
        external_id: externalId || paymentData?.external_id,
        amount: paymentData?.amount,
        status: currentStatus,
        is_paid: isPaid,
        paid_at: paymentData?.paid_at || null,
        source: "DATABASE",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API PAYMENT STATUS ERROR]", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: "Gagal mengambil status pembayaran transaksi.",
        data: null,
        errors: [error.message || "Internal Server Error"],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
