/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Konfigurasi Sistem Backend
 * File: gas/Config.gs
 * ============================================================================
 */

var CONFIG = {
  // Informasi Sistem
  APP_NAME: 'BAYAN VISITOR',
  VERSION: '1.0.0',
  LOCATION: 'Masjid Kuno Bayan, Lombok Utara, NTB',
  
  // Zona Waktu Resmi Aplikasi: WITA (UTC+8)
  TIMEZONE: 'Asia/Makassar',
  TIMEZONE_OFFSET: '+08:00',
  DATE_FORMAT: 'yyyy-MM-dd',
  TIME_FORMAT: 'HH:mm:ss',
  DATETIME_FORMAT: "yyyy-MM-dd'T'HH:mm:ssXXX",

  // Toleransi Perbedaan Waktu Request (Replay Attack Prevention)
  MAX_TIMESTAMP_DRIFT_SECONDS: 300, // 5 menit

  // Durasi Kunci Akses Bersamaan (LockService Timeout)
  LOCK_TIMEOUT_MS: 15000, // 15 detik

  // Status Entitas
  STATUS: {
    ADMIN: {
      AKTIF: 'AKTIF',
      NONAKTIF: 'NONAKTIF'
    },
    ROLES: {
      SUPER_ADMIN: 'SUPER_ADMIN',
      ADMIN: 'ADMIN'
    },
    KUNJUNGAN: {
      TERDAFTAR: 'TERDAFTAR',
      TERVERIFIKASI: 'TERVERIFIKASI',
      CHECK_IN: 'CHECK-IN',
      SELESAI: 'SELESAI',
      BATAL: 'BATAL'
    },
    PRODUK: {
      AKTIF: 'AKTIF',
      NONAKTIF: 'NONAKTIF'
    },
    INVENTARIS: {
      TERSEDIA: 'TERSEDIA',
      DITAHAN: 'DITAHAN',
      DISEWA: 'DISEWA',
      PERAWATAN: 'PERAWATAN',
      RUSAK: 'RUSAK',
      HILANG: 'HILANG'
    },
    TRANSAKSI: {
      DRAFT: 'DRAFT',
      DISEWA: 'DISEWA',
      SELESAI: 'SELESAI',
      DIBATALKAN: 'DIBATALKAN'
    },
    PEMBAYARAN: {
      BELUM_DIBAYAR: 'BELUM_DIBAYAR',
      MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI',
      LUNAS: 'LUNAS',
      BERHASIL: 'BERHASIL',
      GAGAL: 'GAGAL',
      KEDALUWARSA: 'KEDALUWARSA'
    },
    METODE_PEMBAYARAN: {
      TUNAI: 'TUNAI',
      QRIS: 'QRIS',
      QRIS_BAYANNESIA: 'QRIS BAYANNESIA',
      QRIS_BUMDES: 'QRIS BUMDES BAYAN'
    },
    PENGEMBALIAN: {
      DITERIMA: 'DITERIMA',
      PERLU_TINDAK_LANJUT: 'PERLU_TINDAK_LANJUT',
      SELESAI: 'SELESAI'
    }
  },

  // Prefix ID Unik Setiap Entitas
  ID_PREFIX: {
    ADMIN: 'ADM',
    PENGUNJUNG: 'VIS',
    KUNJUNGAN: 'VST',
    PRODUK: 'PRD',
    INVENTARIS: 'INV',
    TRANSAKSI: 'TRX',
    DETAIL_TRANSAKSI: 'DTR',
    PEMBAYARAN: 'PAY',
    PAYMENTS: 'PAY',
    WEBHOOK_LOGS: 'WHK',
    PENGEMBALIAN: 'RET',
    LOG_AKTIVITAS: 'LOG',
    PENGATURAN: 'SET'
  }
};

/**
 * Mendapatkan konfigurasi rahasia dari Google Apps Script Script Properties.
 * Kredensial tidak pernah ditulis langsung di kode program (hardcode).
 */
function getSystemProperty(key, defaultValue) {
  try {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (val !== null && val !== undefined && val !== '') {
      return val;
    }
    return defaultValue !== undefined ? defaultValue : null;
  } catch (err) {
    Logger.log('[CONFIG ERROR] Gagal membaca Script Property ' + key + ': ' + err.message);
    return defaultValue !== undefined ? defaultValue : null;
  }
}

/**
 * Mengatur atau memperbarui Script Property
 */
function setSystemProperty(key, value) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(key, String(value));
}

/**
 * Mengambil Shared Secret Key untuk verifikasi tanda tangan HMAC Server-to-Server
 */
function getApiSecretKey() {
  var secret = getSystemProperty('API_SECRET_KEY');
  if (!secret) {
    Logger.log('[PERINGATAN KEAMANAN] API_SECRET_KEY belum diatur di Script Properties!');
  }
  return secret || '';
}

/**
 * Mengambil ID Google Spreadsheet database utama
 */
function getDatabaseSpreadsheetId() {
  return getSystemProperty('SPREADSHEET_ID');
}
