/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Kriptografi & Tanda Tangan Digital DANA
 * File: src/lib/dana/crypto.ts
 * ============================================================================
 * 
 * Modul ini menangani:
 * 1. Pembuatan tanda tangan digital RSA-SHA256 untuk request ke DANA API.
 * 2. Verifikasi tanda tangan digital RSA-SHA256 notifikasi webhook DANA.
 * 3. Hashing SHA-256 kanonikal dan pembuatan external_id transaksi unik.
 * 
 * Berjalan EKSKLUSIF di Server (Node.js runtime).
 */

import crypto from "node:crypto";

/**
 * Memformat string kunci RSA PEM agar memiliki header/footer dan newline yang valid
 */
export function formatPemKey(rawKey: string, type: "PRIVATE" | "PUBLIC"): string {
  let cleaned = rawKey.trim().replace(/\\n/g, "\n");

  if (type === "PRIVATE") {
    if (!cleaned.includes("-----BEGIN")) {
      cleaned = `-----BEGIN RSA PRIVATE KEY-----\n${cleaned}\n-----END RSA PRIVATE KEY-----`;
    }
  } else {
    if (!cleaned.includes("-----BEGIN")) {
      cleaned = `-----BEGIN PUBLIC KEY-----\n${cleaned}\n-----END PUBLIC KEY-----`;
    }
  }

  return cleaned;
}

/**
 * Menghitung tanda tangan digital RSA-SHA256 (SHA256withRSA)
 * Menghasilkan string base64 sesuai spesifikasi DANA Developer & SNAP BI.
 */
export function signWithRsaSha256(dataToSign: string, privateKeyPem: string): string {
  const formattedKey = formatPemKey(privateKeyPem, "PRIVATE");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(dataToSign);
  return signer.sign(formattedKey, "base64");
}

/**
 * Memverifikasi tanda tangan digital RSA-SHA256 (SHA256withRSA)
 * dari DANA Public Key terhadap string data yang diterima.
 */
export function verifyWithRsaSha256(
  dataToVerify: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const formattedKey = formatPemKey(publicKeyPem, "PUBLIC");
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(dataToVerify);
    return verifier.verify(formattedKey, signatureBase64, "base64");
  } catch (error) {
    console.error("[DANA CRYPTO ERROR] Gagal memverifikasi signature RSA:", error);
    return false;
  }
}

/**
 * Menghitung hash SHA-256 dalam format lowercase hexadecimal
 */
export function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex").toLowerCase();
}

/**
 * Memvalidasi tanda tangan webhook resmi dari DANA menggunakan DANA Public Key
 * Mendukung format kanonikal resmi SNAP BI dan format DANA Direct Open API.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  timestamp,
  publicKeyPem,
  path = "/api/webhooks/dana",
  httpMethod = "POST",
}: {
  rawBody: string;
  signature: string;
  timestamp: string;
  publicKeyPem: string;
  path?: string;
  httpMethod?: string;
}): boolean {
  if (!signature || !publicKeyPem) {
    return false;
  }

  const bodyHash = sha256Hex(rawBody);

  // Format 1: Standar SNAP BI (HTTPMethod:Endpoint:LowercaseHexSHA256(Body):Timestamp)
  const snapBiStringToSign = `${httpMethod.toUpperCase()}:${path}:${bodyHash}:${timestamp}`;
  if (verifyWithRsaSha256(snapBiStringToSign, signature, publicKeyPem)) {
    return true;
  }

  // Format 2: DANA Direct Payload (Timestamp + "|" + RawBody)
  const directStringToSignA = `${timestamp}|${rawBody}`;
  if (verifyWithRsaSha256(directStringToSignA, signature, publicKeyPem)) {
    return true;
  }

  // Format 3: Raw Body langsung
  if (verifyWithRsaSha256(rawBody, signature, publicKeyPem)) {
    return true;
  }

  // Format 4: Timestamp + ":" + BodyHash
  const directStringToSignB = `${timestamp}:${bodyHash}`;
  if (verifyWithRsaSha256(directStringToSignB, signature, publicKeyPem)) {
    return true;
  }

  return false;
}

/**
 * Menghasilkan external_id transaksi yang unik dan collision-free
 * Format: DANA-{timestamp}-{randomHex}
 */
export function generateExternalId(orderId?: string): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  const cleanOrderId = (orderId || "TRX").replace(/[^a-zA-Z0-9]/g, "");
  return `DANA-${cleanOrderId}-${timestamp}-${randomSuffix}`;
}
