/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Jembatan Komunikasi Server-to-Server (GAS Client Bridge)
 * File: src/lib/gas-client.ts
 * ============================================================================
 * 
 * Modul ini berjalan EKSKLUSIF di Next.js Server (Node.js runtime).
 * Mengirimkan permintaan terotentikasi ke Google Apps Script Web App dengan
 * tanda tangan digital HMAC-SHA256, timestamp, dan nonce unik untuk
 * mencegah manipulasi data serta serangan replay.
 */

import crypto from "node:crypto";
import { ApiResponse } from "@/types";

interface GasRequestEnvelope {
  action: string;
  payload: any;
  timestamp: number;
  nonce: string;
  signature: string;
}

/**
 * Menghitung tanda tangan HMAC-SHA256 sesuai format kanonikal gas/Security.gs
 * Rumus: HMAC-SHA256(action + ":" + timestamp + ":" + nonce + ":" + JSON.stringify(payload), SECRET)
 */
function computeHmacSignature(
  action: string,
  timestamp: number,
  nonce: string,
  payload: any,
  secretKey: string
): string {
  const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
  const canonicalString = `${action}:${timestamp}:${nonce}:${payloadString}`;
  return crypto.createHmac("sha256", secretKey).update(canonicalString).digest("hex");
}

/**
 * Memanggil API Google Apps Script Web App dari Next.js Server
 * 
 * @param action Nama action yang dituju (contoh: "visitor:create", "visit:register", "auth:login")
 * @param payload Objek data yang dikirimkan
 * @returns Objek ApiResponse standar { success, message, data, errors, timestamp }
 */
export async function callGasApi<T = any>(
  action: string,
  payload: any = {}
): Promise<ApiResponse<T>> {
  const webAppUrl = process.env.GAS_WEBAPP_URL;
  const secretKey = process.env.GAS_API_SECRET_KEY;

  if (!webAppUrl || webAppUrl.includes("AKfycbx...")) {
    return {
      success: false,
      message: "GAS_WEBAPP_URL belum dikonfigurasi pada .env.local",
      data: null as any,
      errors: ["Endpoint Google Apps Script Web App belum diatur."],
      timestamp: new Date().toISOString(),
    };
  }

  if (!secretKey) {
    return {
      success: false,
      message: "GAS_API_SECRET_KEY belum dikonfigurasi pada .env.local",
      data: null as any,
      errors: ["Kunci rahasia HMAC server-to-server belum diatur."],
      timestamp: new Date().toISOString(),
    };
  }

  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const signature = computeHmacSignature(action, timestamp, nonce, payload, secretKey);

  const requestBody: GasRequestEnvelope = {
    action,
    payload,
    timestamp,
    nonce,
    signature,
  };

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      // Hindari caching di Next.js Data Cache untuk request operasional dinamis
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP Error ${response.status}: Gagal menghubungi server Google Apps Script`,
        data: null as any,
        errors: [`HTTP Status: ${response.statusText}`],
        timestamp: new Date().toISOString(),
      };
    }

    const jsonResult: ApiResponse<T> = await response.json();
    return jsonResult;
  } catch (err: any) {
    return {
      success: false,
      message: `Koneksi ke backend gagal: ${err.message}`,
      data: null as any,
      errors: [err.message],
      timestamp: new Date().toISOString(),
    };
  }
}
