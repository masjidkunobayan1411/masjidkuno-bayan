/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Integrasi Klien API Resmi DANA Developer (QRIS MPM & Query Payment)
 * File: src/lib/dana/dana-api.ts
 * ============================================================================
 * 
 * Modul ini menangani panggilan HTTP terotentikasi ke Gateway DANA:
 * - Generate QRIS Dinamis MPM (Merchant Presented Mode)
 * - Pengecekan status transaksi (Query Payment API)
 * 
 * Mengikuti spesifikasi resmi DANA Developer & SNAP BI.
 * Berjalan EKSKLUSIF di Server (Node.js runtime).
 */

import { getDanaConfig } from "./config";
import { signWithRsaSha256 } from "./crypto";

export interface GenerateQrisParams {
  orderId: string;
  externalId: string;
  amount: number;
  orderTitle?: string;
  validityMinutes?: number;
}

export interface GenerateQrisResult {
  qrContent: string;
  externalId: string;
  orderId: string;
  danaReferenceNo?: string;
  expiredAt: string;
  amount: number;
  currency: string;
}

export interface QueryPaymentResult {
  orderId: string;
  externalId: string;
  danaReferenceNo?: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  paidAt?: string;
  rawResponse?: any;
}

/**
 * Format tanggal ISO 8601 dengan offset zona waktu WITA / Indonesia (+08:00)
 */
function getIsoTimestampWithOffset(date: Date = new Date()): string {
  // Offset WITA = +08:00 (480 menit)
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  // Format standard ISO-8601
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

/**
 * Memanggil API DANA untuk menghasilkan QRIS MPM Dinamis
 */
export async function generateDanaQris(params: GenerateQrisParams): Promise<GenerateQrisResult> {
  const config = getDanaConfig();
  const validityMinutes = params.validityMinutes || 30; // Default QRIS berlaku 30 menit
  
  const now = new Date();
  const expiredDate = new Date(now.getTime() + validityMinutes * 60 * 1000);
  
  const timestampIso = getIsoTimestampWithOffset(now);
  const expiredAtIso = getIsoTimestampWithOffset(expiredDate);

  const endpointPath = "/v1.0/qr/qr-mpm-generate";
  const url = `${config.baseUrl}${endpointPath}`;

  const requestBody = {
    partnerReferenceNo: params.orderId,
    amount: {
      value: params.amount.toFixed(2),
      currency: "IDR",
    },
    merchantId: config.merchantId,
    validityPeriod: expiredAtIso,
    additionalInfo: {
      orderTitle: params.orderTitle || `Sewa Pakaian Adat Bayan - ${params.orderId}`,
      externalId: params.externalId,
    },
  };

  const bodyString = JSON.stringify(requestBody);

  // String to sign kanonikal DANA SNAP BI: Client-Id + "|" + X-Timestamp
  const stringToSign = `${config.clientId}|${timestampIso}`;
  const signature = signWithRsaSha256(stringToSign, config.privateKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-TIMESTAMP": timestampIso,
    "X-PARTNER-ID": config.clientId,
    "X-CLIENT-KEY": config.clientId,
    "X-EXTERNAL-ID": params.externalId,
    "X-SIGNATURE": signature,
    "CHANNEL-ID": "95221",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: bodyString,
      cache: "no-store",
    });

    const responseJson = await response.json().catch(() => null);

    if (!response.ok || !responseJson) {
      const errCode = responseJson?.responseCode || response.status;
      const errMsg = responseJson?.responseMessage || response.statusText || "Koneksi ke gateway DANA gagal";
      throw new Error(`[DANA API ERROR ${errCode}] ${errMsg}`);
    }

    // Mendukung struktur balasan SNAP BI (qrContent) atau DANA Acquirer (qr_code / qrUrl)
    const qrContent = responseJson.qrContent || responseJson.qr_code || responseJson.data?.qrContent || responseJson.data?.qrCode;
    const danaRef = responseJson.referenceNo || responseJson.danaReferenceNo || responseJson.data?.referenceNo || "";

    if (!qrContent) {
      throw new Error(
        `DANA API tidak mengembalikan string QRIS yang valid. Respon: ${JSON.stringify(responseJson)}`
      );
    }

    return {
      qrContent,
      externalId: params.externalId,
      orderId: params.orderId,
      danaReferenceNo: danaRef,
      expiredAt: expiredAtIso,
      amount: params.amount,
      currency: "IDR",
    };
  } catch (error: any) {
    console.error("[DANA API] Gagal generate QRIS:", error.message || error);
    throw error;
  }
}

/**
 * Memanggil API DANA untuk memeriksa status pembayaran (Query Payment API)
 */
export async function queryDanaPayment(
  orderId: string,
  externalId: string
): Promise<QueryPaymentResult> {
  const config = getDanaConfig();
  const timestampIso = getIsoTimestampWithOffset(new Date());

  const endpointPath = "/v1.0/qr/qr-mpm-query";
  const url = `${config.baseUrl}${endpointPath}`;

  const requestBody = {
    partnerReferenceNo: orderId,
    originalExternalId: externalId,
    merchantId: config.merchantId,
    serviceCode: "47",
  };

  const stringToSign = `${config.clientId}|${timestampIso}`;
  const signature = signWithRsaSha256(stringToSign, config.privateKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-TIMESTAMP": timestampIso,
    "X-PARTNER-ID": config.clientId,
    "X-CLIENT-KEY": config.clientId,
    "X-EXTERNAL-ID": `QRY-${Date.now()}`,
    "X-SIGNATURE": signature,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const responseJson = await response.json().catch(() => null);

    if (!response.ok || !responseJson) {
      const errCode = responseJson?.responseCode || response.status;
      const errMsg = responseJson?.responseMessage || response.statusText || "Gagal query status DANA";
      throw new Error(`[DANA QUERY ERROR ${errCode}] ${errMsg}`);
    }

    const latestTxStatus = (
      responseJson.latestTransactionStatus ||
      responseJson.status ||
      responseJson.data?.status ||
      ""
    ).toUpperCase();

    let status: "PENDING" | "PAID" | "EXPIRED" | "FAILED" = "PENDING";
    if (latestTxStatus === "SUCCESS" || latestTxStatus === "PAID" || latestTxStatus === "00") {
      status = "PAID";
    } else if (latestTxStatus === "EXPIRED") {
      status = "EXPIRED";
    } else if (latestTxStatus === "FAILED" || latestTxStatus === "CANCELLED") {
      status = "FAILED";
    }

    const amountValue = Number(responseJson.amount?.value || responseJson.data?.amount || 0);
    const paidAt = responseJson.paidTime || responseJson.transactionDate || responseJson.data?.paidTime;

    return {
      orderId,
      externalId,
      danaReferenceNo: responseJson.referenceNo || responseJson.data?.referenceNo,
      amount: amountValue,
      currency: responseJson.amount?.currency || "IDR",
      status,
      paidAt,
      rawResponse: responseJson,
    };
  } catch (error: any) {
    console.error("[DANA API] Gagal query pembayaran:", error.message || error);
    throw error;
  }
}
