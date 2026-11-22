/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Next.js Edge Middleware Proteksi Rute & Otorisasi Role
 * File: src/middleware.ts
 * ============================================================================
 * 
 * Middleware ini mencegat setiap navigasi ke /dashboard/* dan memvalidasi
 * integritas token sesi JWT pada cookie HttpOnly sebelum halaman dirender.
 * Pengguna tanpa sesi valid dialihkan ke /login, dan role non-Super Admin
 * dibatasi dari halaman administrasi sensitif.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SessionUser } from "@/types";

const COOKIE_NAME = "bayan_session";

function getEncodedSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "bayan-default-secret-key-32-chars-long-2026";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME);

  let sessionUser: SessionUser | null = null;

  if (sessionCookie?.value) {
    try {
      const secretKey = getEncodedSecretKey();
      const { payload } = await jwtVerify(sessionCookie.value, secretKey, {
        algorithms: ["HS256"],
      });
      sessionUser = (payload.user as SessionUser) || null;
    } catch (err) {
      // Token kedaluwarsa atau manipulasi token
      sessionUser = null;
    }
  }

  const isAuthenticated = !!(sessionUser && sessionUser.admin_id && sessionUser.status === "AKTIF");

  // 1. Jika pengguna sudah login dan mencoba membuka /login -> alihkan ke /dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 2. Proteksi seluruh rute /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    // Jika belum login -> alihkan ke /login disertai query redirect
    if (!isAuthenticated || !sessionUser) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      // Bersihkan cookie yang tidak valid jika ada
      const response = NextResponse.redirect(loginUrl);
      if (sessionCookie) {
        response.cookies.delete(COOKIE_NAME);
      }
      return response;
    }

    // 3. Pembatasan Hak Akses Khusus SUPER_ADMIN
    const isSuperAdminOnlyPath =
      pathname.startsWith("/dashboard/admin-management") ||
      pathname.startsWith("/dashboard/pengaturan");

    if (isSuperAdminOnlyPath && sessionUser.role !== "SUPER_ADMIN") {
      const forbiddenUrl = new URL("/dashboard?error=unauthorized_role", request.url);
      return NextResponse.redirect(forbiddenUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
