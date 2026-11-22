/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Logout Admin & Pembersihan Sesi
 * Endpoint: POST /api/auth/logout
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await destroySession();

    // Jika request dikirim dari form submit HTML bawaan browser
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("text/html")) {
      return NextResponse.redirect(new URL("/login", request.url), 303);
    }

    return NextResponse.json({
      success: true,
      message: "Logout berhasil. Sesi telah diakhiri.",
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Gagal mengakhiri sesi: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await destroySession();
  } catch (e) {
    // Abaikan jika sudah bersih
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
