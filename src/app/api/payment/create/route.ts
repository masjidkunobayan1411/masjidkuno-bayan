/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Pembuatan Transaksi QRIS Dinamis DANA Resmi
 * Endpoint: POST /api/payment/create
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { isDanaConfigured } from "@/lib/dana/config";
import { generateExternalId } from "@/lib/dana/crypto";
import { generateDanaQris } from "@/lib/dana/dana-api";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Sesi tidak aktif atau telah kedaluwarsa. Silakan login kembali.",
          data: null,
          errors: ["Unauthorized"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const orderId = (body.order_id || body.transaction_id || "").trim();

    if (!orderId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "order_id atau transaction_id wajib disertakan.",
          data: null,
          errors: ["Bad Request: Missing order_id"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 1. Ambil detail transaksi dari database (Google Spreadsheet)
    const trxResponse = await callGasApi("transaction:get", { transaction_id: orderId });
    if (!trxResponse.success || !trxResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: trxResponse.message || `Transaksi [${orderId}] tidak ditemukan.`,
          data: null,
          errors: trxResponse.errors || ["Transaction Not Found"],
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const trx = trxResponse.data;

    // 2. Validasi status transaksi
    if (trx.status_pembayaran === "LUNAS") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: `Transaksi [${orderId}] sudah berstatus LUNAS.`,
          data: null,
          errors: ["Transaction Already Paid"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (trx.status_transaksi === "DIBATALKAN") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: `Transaksi [${orderId}] telah dibatalkan.`,
          data: null,
          errors: ["Transaction Cancelled"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const totalHarga = Number(trx.total_harga || 0);
    if (totalHarga <= 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Total tagihan sewa harus lebih dari Rp0.",
          data: null,
          errors: ["Invalid Amount"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 3. Generate external_id unik (Idempotency & Tracking)
    const externalId = generateExternalId(orderId);

    // 4. Verifikasi ketersediaan kredensial DANA
    if (!isDanaConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message:
            "Kredensial DANA Developer belum dikonfigurasi di Environment Variables (DANA_CLIENT_ID, DANA_MERCHANT_ID, DANA_PRIVATE_KEY, DANA_PUBLIC_KEY).",
          data: null,
          errors: ["DANA Gateway Not Configured"],
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // 5. Panggil DANA API resmi untuk Generate QRIS MPM Dinamis
    let qrisResult;
    try {
      qrisResult = await generateDanaQris({
        orderId,
        externalId,
        amount: totalHarga,
        orderTitle: `Sewa Pakaian Adat Bayan - ${orderId}`,
        validityMinutes: 30,
      });
    } catch (danaErr: any) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: `Gagal membuat QRIS dinamis di gateway DANA: ${danaErr.message || danaErr}`,
          data: null,
          errors: [danaErr.message || "DANA Gateway Error"],
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    // 6. Simpan catatan transaksi pembayaran ke Google Spreadsheet
    const gasSaveResponse = await callGasApi("payment:dana_create", {
      order_id: orderId,
      external_id: externalId,
      amount: totalHarga,
      qr_content: qrisResult.qrContent,
      expired_at: qrisResult.expiredAt,
      dana_reference_no: qrisResult.danaReferenceNo || "",
      admin_id: user.admin_id,
    });

    if (!gasSaveResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasSaveResponse.message || "Gagal menyimpan catatan transaksi pembayaran ke database.",
          data: null,
          errors: gasSaveResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // 7. Kembalikan data QRIS dinamis ke frontend
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "QRIS Dinamis DANA berhasil dibuat.",
      data: {
        order_id: orderId,
        external_id: externalId,
        amount: totalHarga,
        currency: "IDR",
        qr_content: qrisResult.qrContent,
        expired_at: qrisResult.expiredAt,
        status: "PENDING",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API PAYMENT CREATE ERROR]", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server saat membuat transaksi pembayaran.",
        data: null,
        errors: [error.message || "Internal Server Error"],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
