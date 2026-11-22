/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Manajemen Sesi Aman (HttpOnly Cookie & Enkripsi JWT)
 * File: src/lib/session.ts
 * ============================================================================
 * 
 * Modul ini menangani otentikasi sesi di Next.js Server menggunakan cookie
 * HttpOnly, Secure, dan SameSite. Token tidak pernah disimpan di localStorage
 * guna mencegah serangan Cross-Site Scripting (XSS).
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SessionUser, AdminRole } from "@/types";

const COOKIE_NAME = "bayan_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 Jam

function getEncodedSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "bayan-default-secret-key-32-chars-long-2026";
  return new TextEncoder().encode(secret);
}

/**
 * Membuat Sesi Login Baru dan Menyimpannya di Cookie HttpOnly
 */
export async function createSession(user: SessionUser): Promise<string> {
  const secretKey = getEncodedSecretKey();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;

  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return token;
}

/**
 * Membaca dan Memverifikasi Sesi dari Cookie HttpOnly
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(COOKIE_NAME);

    if (!cookie || !cookie.value) {
      return null;
    }

    const secretKey = getEncodedSecretKey();
    const { payload } = await jwtVerify(cookie.value, secretKey, {
      algorithms: ["HS256"],
    });

    const sessionUser = payload.user as SessionUser;
    if (!sessionUser || !sessionUser.admin_id) {
      return null;
    }

    return sessionUser;
  } catch (err) {
    // Token tidak valid, kedaluwarsa, atau dimanipulasi
    return null;
  }
}

/**
 * Menghapus Sesi (Logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Pemeriksaan Hak Akses Server-Side Guard
 * Dapat digunakan di Server Actions atau Route Handlers
 */
export async function requireAuth(requiredRole?: AdminRole): Promise<SessionUser> {
  const user = await getSession();

  if (!user) {
    throw new Error("UNAUTHORIZED: Sesi login tidak ditemukan atau telah kedaluwarsa.");
  }

  if (user.status !== "AKTIF") {
    throw new Error("FORBIDDEN: Akun Anda sedang dinonaktifkan.");
  }

  if (requiredRole === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN: Operasi ini membutuhkan kewenangan Super Admin.");
  }

  return user;
}
