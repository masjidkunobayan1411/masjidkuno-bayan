/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Login Admin & Pembuatan Sesi
 * Endpoint: POST /api/auth/login
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { callGasApi } from "@/lib/gas-client";
import { createSession } from "@/lib/session";
import { SessionUser, ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email dan password wajib diisi.",
          data: null,
          errors: ["Parameter email dan password tidak boleh kosong."],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 1. Hubungi Backend Google Apps Script melalui Jembatan HMAC Aman
    const gasResponse = await callGasApi<SessionUser>("auth:login", {
      email,
      password,
    });

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json(
        {
          success: false,
          message: gasResponse.message || "Email atau password tidak sesuai.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const adminUser = gasResponse.data;

    // 2. Terbitkan Sesi Enkripsi JWT pada Cookie HttpOnly
    await createSession(adminUser);

    return NextResponse.json({
      success: true,
      message: "Login berhasil. Mengalihkan ke dashboard...",
      data: adminUser,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Terjadi kesalahan saat memproses login: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
