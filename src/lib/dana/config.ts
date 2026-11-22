/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Konfigurasi & Kredensial Payment Gateway DANA
 * File: src/lib/dana/config.ts
 * ============================================================================
 * 
 * Modul ini berjalan EKSKLUSIF di Server Runtime (Node.js).
 * Membaca variabel lingkungan resmi DANA untuk mode Sandbox maupun Produksi.
 * Private key tidak pernah diekspos ke browser / client-side.
 */

export interface DanaConfig {
  baseUrl: string;
  clientId: string;
  merchantId: string;
  privateKey: string;
  publicKey: string;
  env: "sandbox" | "production";
  webhookPath: string;
}

/**
 * Memeriksa apakah konfigurasi DANA sudah lengkap di environment variables
 */
export function isDanaConfigured(): boolean {
  const clientId = process.env.DANA_CLIENT_ID;
  const merchantId = process.env.DANA_MERCHANT_ID;
  const privateKey = process.env.DANA_PRIVATE_KEY;
  const publicKey = process.env.DANA_PUBLIC_KEY;

  return Boolean(clientId && merchantId && privateKey && publicKey);
}

/**
 * Mengambil konfigurasi DANA dengan validasi kelengkapan.
 * Menghasilkan exception informatif jika ada variabel yang belum terpasang.
 */
export function getDanaConfig(): DanaConfig {
  const envRaw = (process.env.DANA_ENV || "sandbox").toLowerCase();
  const env: "sandbox" | "production" = envRaw === "production" ? "production" : "sandbox";
  
  const defaultBaseUrl = env === "production" 
    ? "https://api.dana.id" 
    : "https://api.sandbox.dana.id";

  const baseUrl = (process.env.DANA_BASE_URL || defaultBaseUrl).replace(/\/$/, "");
  const clientId = process.env.DANA_CLIENT_ID?.trim() || "";
  const merchantId = process.env.DANA_MERCHANT_ID?.trim() || "";
  
  // Mengonversi karakter \n literal yang biasa disimpan di env variable menjadi newline sebenarnya
  const privateKey = (process.env.DANA_PRIVATE_KEY || "").trim().replace(/\\n/g, "\n");
  const publicKey = (process.env.DANA_PUBLIC_KEY || "").trim().replace(/\\n/g, "\n");
  const webhookPath = "/api/webhooks/dana";

  if (!clientId || !merchantId || !privateKey || !publicKey) {
    const missing: string[] = [];
    if (!clientId) missing.push("DANA_CLIENT_ID");
    if (!merchantId) missing.push("DANA_MERCHANT_ID");
    if (!privateKey) missing.push("DANA_PRIVATE_KEY");
    if (!publicKey) missing.push("DANA_PUBLIC_KEY");

    throw new Error(
      `Konfigurasi DANA belum lengkap. Variabel yang belum diatur: ${missing.join(", ")}. Harap periksa Vercel Environment Variables atau .env.local.`
    );
  }

  return {
    baseUrl,
    clientId,
    merchantId,
    privateKey,
    publicKey,
    env,
    webhookPath,
  };
}
