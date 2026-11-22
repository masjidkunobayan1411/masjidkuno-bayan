/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Inisiasi & Verifikasi Pembayaran QRIS Gateway
 * Endpoint: POST /api/payments/qris
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
    const { action, transaction_id, referensi_gateway, payment_id, metode_pembayaran } = body;

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

    // 1. Mode Inisiasi Tagihan QRIS (Status: MENUNGGU_VERIFIKASI)
    if (action === "initiate") {
      const gasResponse = await callGasApi("payment:qris_initiate", {
        transaction_id,
        referensi_gateway: referensi_gateway || undefined,
        metode_pembayaran: metode_pembayaran || undefined,
        admin_id: user.admin_id,
      });

      if (!gasResponse.success) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: gasResponse.message || "Gagal membuat tagihan QRIS.",
            data: null,
            errors: gasResponse.errors || [],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Tagihan QRIS berhasil diinisiasi (Menunggu verifikasi gateway/kasir).",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Mode Verifikasi Pembayaran QRIS (Status: LUNAS & DISEWA)
    if (action === "verify") {
      const generatedRef =
        (referensi_gateway && String(referensi_gateway).trim()) ||
        `QRIS-BYN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const specificMetode =
        metode_pembayaran && String(metode_pembayaran).trim()
          ? String(metode_pembayaran).trim()
          : "QRIS BAYANNESIA";

      let gasResponse = await callGasApi("payment:qris_verify", {
        transaction_id,
        payment_id: payment_id || undefined,
        referensi_gateway: generatedRef,
        metode_pembayaran: specificMetode,
        admin_id: user.admin_id,
      });

      // Self-Healing: Jika server GAS (versi cloud) belum memiliki record inisiasi QRIS
      if (
        !gasResponse.success &&
        (gasResponse.message?.includes("Catatan pembayaran") ||
          gasResponse.message?.includes("tidak ditemukan"))
      ) {
        // Coba inisiasi terlebih dahulu dengan metode spesifik
        await callGasApi("payment:qris_initiate", {
          transaction_id,
          referensi_gateway: generatedRef,
          metode_pembayaran: specificMetode,
          admin_id: user.admin_id,
        });

        // Ulangi panggilan verifikasi pelunasan QRIS
        gasResponse = await callGasApi("payment:qris_verify", {
          transaction_id,
          payment_id: payment_id || undefined,
          referensi_gateway: generatedRef,
          metode_pembayaran: specificMetode,
          admin_id: user.admin_id,
        });

        // Jika versi cloud lama hanya mencari string 'QRIS' saat inisiasi
        if (
          !gasResponse.success &&
          (gasResponse.message?.includes("Catatan pembayaran") ||
            gasResponse.message?.includes("tidak ditemukan"))
        ) {
          await callGasApi("payment:qris_initiate", {
            transaction_id,
            referensi_gateway: generatedRef,
            metode_pembayaran: "QRIS",
            admin_id: user.admin_id,
          });

          gasResponse = await callGasApi("payment:qris_verify", {
            transaction_id,
            payment_id: payment_id || undefined,
            referensi_gateway: generatedRef,
            metode_pembayaran: specificMetode,
            admin_id: user.admin_id,
          });
        }
      }

      if (!gasResponse.success) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: gasResponse.message || "Verifikasi QRIS gagal.",
            data: null,
            errors: gasResponse.errors || [],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Pembayaran QRIS berhasil diverifikasi dan transaksi telah lunas.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: "Action tidak dikenal. Gunakan 'initiate' atau 'verify'.",
        data: null,
        errors: ["Bad Request: Unknown action"],
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan internal saat memproses QRIS: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
