/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Pengaturan Sistem & Konfigurasi Operasional
 * Endpoint: /api/settings
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
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

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Akses ditolak: Hanya Super Admin yang berhak melihat pengaturan sistem.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const gasResponse = await callGasApi("system:info", {});

    const settingsData = {
      app_name: "BAYAN VISITOR",
      app_version: "1.0.0",
      location: "Masjid Kuno Bayan, Desa Bayan, Kabupaten Lombok Utara, NTB",
      timezone: "WITA (UTC+8)",
      operating_hours: "08:00 - 17:00 WITA",
      gas_connected: gasResponse.success,
      gas_url_configured: !!process.env.GAS_WEBAPP_URL,
      settings: (gasResponse.success && gasResponse.data?.settings) || [],
    };

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Pengaturan sistem berhasil dimuat.",
      data: settingsData,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat pengaturan: ${err.message}`,
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
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Akses ditolak.",
          data: null,
          errors: ["Unauthorized"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action || "ping";

    if (action === "ping") {
      const pingRes = await callGasApi("system:ping", {});
      return NextResponse.json<ApiResponse<any>>({
        success: pingRes.success,
        message: pingRes.message || "Uji koneksi GAS backend berhasil.",
        data: pingRes.data,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "update") {
      const updateRes = await callGasApi("system:update_settings", {
        settings: body.settings,
        admin_id: user.admin_id || "SUPER_ADMIN",
      });

      if (!updateRes.success) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: updateRes.message || "Gagal memperbarui pengaturan sistem di database cloud.",
            data: null,
            errors: updateRes.errors || [],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: updateRes.message || "Pengaturan sistem berhasil disimpan ke database Google Spreadsheet.",
        data: updateRes.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Aksi [${action}] tidak valid atau tidak dikenali.`,
        data: null,
        errors: ["InvalidAction"],
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Gagal memperbarui pengaturan: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
