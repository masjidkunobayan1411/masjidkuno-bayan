/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Keamanan, Autentikasi Server-to-Server HMAC & Otorisasi Role
 * File: gas/Security.gs
 * ============================================================================
 * 
 * Modul ini memvalidasi integritas request server-to-server dari Next.js (Vercel)
 * ke Google Apps Script tanpa mengandalkan custom HTTP headers (yang sering
 * dipotong oleh proxy Google). Menggunakan tanda tangan HMAC-SHA256, timestamp,
 * dan nonce untuk mencegah manipulasi data dan serangan replay.
 */

var Security = (function() {
  /**
   * Perbandingan string konstan-waktu (Constant-time comparison)
   * Mencegah timing attack pada pencocokan tanda tangan HMAC.
   */
  function constantTimeCompare_(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    var result = 0;
    for (var i = 0; i < a.length; i++) {
      result |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return result === 0;
  }

  /**
   * Menghitung tanda tangan HMAC-SHA256 dari string kanonikal
   */
  function calculateHmac_(message, secret) {
    var signatureBytes = Utilities.computeHmacSha256Signature(message, secret);
    return signatureBytes.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  /**
   * Validasi Tanda Tangan HMAC Server-to-Server
   * 
   * Struktur body request:
   * {
   *   "action": "nama_aksi",
   *   "payload": { ... },
   *   "timestamp": 1730900000000, // milidetik
   *   "nonce": "unique-random-string",
   *   "signature": "hmac_sha256_hex"
   * }
   */
  function verifyServerSignature(requestData) {
    var secret = getApiSecretKey();
    
    // Jika API_SECRET_KEY belum diatur di Script Properties (fase bootstrap),
    // kembalikan peringatan konfigurasi
    if (!secret) {
      return {
        valid: false,
        message: 'Konfigurasi server belum lengkap: API_SECRET_KEY belum diatur di Script Properties.'
      };
    }

    if (!requestData || typeof requestData !== 'object') {
      return { valid: false, message: 'Format body request tidak valid atau kosong.' };
    }

    var action = requestData.action || '';
    var payload = requestData.payload || {};
    var timestamp = Number(requestData.timestamp);
    var nonce = String(requestData.nonce || '').trim();
    var clientSignature = String(requestData.signature || '').trim();

    // 1. Validasi Kehadiran Parameter Keamanan
    if (!timestamp || !nonce || !clientSignature) {
      return {
        valid: false,
        message: 'Autentikasi gagal: Parameter keamanan (timestamp, nonce, signature) tidak lengkap.'
      };
    }

    // 2. Validasi Toleransi Timestamp (Maksimal 5 Menit / 300 Detik)
    var nowMs = new Date().getTime();
    var diffSeconds = Math.abs(nowMs - timestamp) / 1000;
    if (diffSeconds > CONFIG.MAX_TIMESTAMP_DRIFT_SECONDS) {
      return {
        valid: false,
        message: 'Request kedaluwarsa atau terjadi deviasi waktu (Drift: ' + Math.round(diffSeconds) + ' detik).'
      };
    }

    // 3. Pencegahan Replay Attack Menggunakan Nonce Cache
    var cache = CacheService.getScriptCache();
    var nonceCacheKey = 'nonce_' + nonce;
    if (cache.get(nonceCacheKey)) {
      return {
        valid: false,
        message: 'Replay attack terdeteksi: Nonce request sudah pernah digunakan.'
      };
    }
    // Simpan nonce selama 10 menit (600 detik)
    cache.put(nonceCacheKey, '1', 600);

    // 4. Rekonstruksi String Kanonikal dan Verifikasi HMAC
    // Urutan kanonikal: action + ":" + timestamp + ":" + nonce + ":" + JSON.stringify(payload)
    var payloadString = (typeof payload === 'string') ? payload : JSON.stringify(payload);
    var canonicalString = action + ':' + timestamp + ':' + nonce + ':' + payloadString;
    var expectedSignature = calculateHmac_(canonicalString, secret);

    if (!constantTimeCompare_(clientSignature.toLowerCase(), expectedSignature.toLowerCase())) {
      return {
        valid: false,
        message: 'Tanda tangan digital (HMAC Signature) tidak valid atau payload telah dimanipulasi.'
      };
    }

    return {
      valid: true,
      action: action,
      payload: payload
    };
  }

  /**
   * Otorisasi Hak Akses Berdasarkan Role Admin
   */
  function authorizeRole(currentRole, requiredRole) {
    if (!currentRole) {
      return { authorized: false, message: 'Sesi belum terotentikasi. Role tidak ditemukan.' };
    }

    if (currentRole === CONFIG.STATUS.ROLES.SUPER_ADMIN) {
      return { authorized: true };
    }

    if (requiredRole === CONFIG.STATUS.ROLES.SUPER_ADMIN && currentRole !== CONFIG.STATUS.ROLES.SUPER_ADMIN) {
      return {
        authorized: false,
        message: 'Akses ditolak: Operasi ini hanya diperuntukkan bagi Super Admin.'
      };
    }

    if (requiredRole === CONFIG.STATUS.ROLES.ADMIN && (currentRole === CONFIG.STATUS.ROLES.ADMIN || currentRole === CONFIG.STATUS.ROLES.SUPER_ADMIN)) {
      return { authorized: true };
    }

    return { authorized: false, message: 'Akses ditolak: Kewenangan tidak mencukupi.' };
  }

  return {
    verifyServerSignature: verifyServerSignature,
    authorizeRole: authorizeRole,
    calculateHmac: calculateHmac_
  };
})();
