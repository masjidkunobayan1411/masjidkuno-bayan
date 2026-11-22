/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Inisialisasi Database Google Spreadsheet
 * File: gas/InitDatabase.gs
 * ============================================================================
 * 
 * Script ini digunakan untuk membuat dan mengonfigurasi 11 sheet database secara
 * otomatis pada Google Spreadsheet dengan header kolom, styling visual,
 * serta data awal produk dan pengaturan sesuai standar spesifikasi.
 */

/**
 * Definisi Skema Resmi 11 Sheet dan Kolom Sesuai Master Prompt
 */
var BAYAN_SCHEMA = {
  ADMIN: [
    'admin_id',
    'nama',
    'email',
    'password_hash',
    'role',
    'status',
    'dibuat_pada',
    'terakhir_login'
  ],
  PENGUNJUNG: [
    'visitor_id',
    'nama_pengunjung',
    'jenis_pengunjung',
    'negara',
    'provinsi',
    'kabupaten_kota',
    'nomor_telepon',
    'asal_instansi',
    'dibuat_pada'
  ],
  KUNJUNGAN: [
    'visit_id',
    'visitor_id',
    'tanggal_kunjungan',
    'waktu_kunjungan',
    'jumlah_dewasa',
    'jumlah_anak',
    'total_pengunjung',
    'tujuan_kunjungan',
    'bahasa',
    'persetujuan_data',
    'status_kunjungan'
  ],
  PRODUK: [
    'product_id',
    'kode_produk',
    'nama_produk',
    'kategori',
    'harga_sewa',
    'satuan',
    'deskripsi',
    'status',
    'dibuat_pada',
    'diperbarui_pada'
  ],
  INVENTARIS: [
    'inventory_id',
    'product_id',
    'kode_barang',
    'kondisi',
    'status',
    'tanggal_masuk',
    'keterangan'
  ],
  TRANSAKSI: [
    'transaction_id',
    'visit_id',
    'tanggal_transaksi',
    'total_barang',
    'total_harga',
    'status_transaksi',
    'status_pembayaran',
    'petugas_id',
    'dibuat_pada'
  ],
  DETAIL_TRANSAKSI: [
    'detail_id',
    'transaction_id',
    'inventory_id',
    'product_id',
    'nama_produk_snapshot',
    'harga_snapshot',
    'jumlah',
    'subtotal'
  ],
  PEMBAYARAN: [
    'payment_id',
    'transaction_id',
    'metode_pembayaran',
    'jumlah_bayar',
    'status_pembayaran',
    'referensi_gateway',
    'waktu_pembayaran',
    'diverifikasi_oleh'
  ],
  PENGEMBALIAN: [
    'return_id',
    'transaction_id',
    'inventory_id',
    'waktu_pengembalian',
    'kondisi_pengembalian',
    'status_pengembalian',
    'petugas_id',
    'keterangan'
  ],
  LOG_AKTIVITAS: [
    'log_id',
    'admin_id',
    'aktivitas',
    'objek',
    'objek_id',
    'waktu',
    'keterangan'
  ],
  PENGATURAN: [
    'setting_id',
    'nama_pengaturan',
    'nilai',
    'keterangan',
    'diperbarui_pada'
  ],
  // Tabel Transaksi Gateway Resmi DANA (QRIS Dinamis MPM)
  PAYMENTS: [
    'payment_id',
    'order_id',
    'external_id',
    'dana_reference_no',
    'amount',
    'currency',
    'qr_content',
    'status',
    'created_at',
    'expired_at',
    'paid_at'
  ],
  // Tabel Audit Trail Webhook Finish Notify DANA
  WEBHOOK_LOGS: [
    'webhook_id',
    'payment_id',
    'event_type',
    'signature_valid',
    'processing_status',
    'received_at',
    'processed_at'
  ]
};

/**
 * Data Produk Awal Wajib Sesuai Bagian D Master Prompt
 */
var INITIAL_PRODUCTS = [
  {
    product_id: 'PRD-POL',
    kode_produk: 'POL',
    nama_produk: 'Kain Poleng',
    kategori: 'PAKAIAN_ADAT',
    harga_sewa: 20000,
    satuan: 'unit/kunjungan',
    deskripsi: 'Kain adat khas Bayan motif Poleng (kotak hitam putih) syarat kesopanan memasuki area situs suci Masjid Kuno Bayan.',
    status: 'AKTIF'
  },
  {
    product_id: 'PRD-BAT',
    kode_produk: 'BAT',
    nama_produk: 'Kain Batik',
    kategori: 'PAKAIAN_ADAT',
    harga_sewa: 10000,
    satuan: 'unit/kunjungan',
    deskripsi: 'Kain batik bawahan adat sopan untuk pengunjung pria maupun wanita.',
    status: 'AKTIF'
  }
];

/**
 * Data Pengaturan Awal Sistem
 */
var INITIAL_SETTINGS = [
  {
    setting_id: 'SET-001',
    nama_pengaturan: 'nama_aplikasi',
    nilai: 'BAYAN VISITOR',
    keterangan: 'Nama resmi aplikasi web digitalisasi'
  },
  {
    setting_id: 'SET-002',
    nama_pengaturan: 'lokasi_situs',
    nilai: 'Masjid Kuno Bayan, Desa Bayan, Kabupaten Lombok Utara, NTB',
    keterangan: 'Nama dan lokasi situs cagar budaya'
  },
  {
    setting_id: 'SET-003',
    nama_pengaturan: 'zona_waktu',
    nilai: 'Asia/Makassar',
    keterangan: 'Zona waktu operasional aplikasi (WITA, UTC+8)'
  },
  {
    setting_id: 'SET-004',
    nama_pengaturan: 'jam_operasional_buka',
    nilai: '08:00',
    keterangan: 'Waktu mulai jam operasional kunjungan'
  },
  {
    setting_id: 'SET-005',
    nama_pengaturan: 'jam_operasional_tutup',
    nilai: '17:00',
    keterangan: 'Waktu akhir jam operasional kunjungan'
  },
  {
    setting_id: 'SET-006',
    nama_pengaturan: 'metode_pembayaran_aktif',
    nilai: 'TUNAI,QRIS',
    keterangan: 'Metode pembayaran sewa yang diaktifkan di sistem'
  },
  {
    setting_id: 'SET-007',
    nama_pengaturan: 'denda_rusak_default',
    nilai: '50000',
    keterangan: 'Biaya denda perbaikan standar pakaian adat rusak'
  },
  {
    setting_id: 'SET-008',
    nama_pengaturan: 'denda_hilang_default',
    nilai: '100000',
    keterangan: 'Biaya ganti rugi standar pakaian adat hilang'
  },
  {
    setting_id: 'SET-009',
    nama_pengaturan: 'skema_database_versi',
    nilai: '1.0.0',
    keterangan: 'Versi skema database terpasang'
  }
];

/**
 * Mendapatkan timestamp saat ini dalam format ISO WITA
 */
function getWitaTimestamp_() {
  var now = new Date();
  return Utilities.formatDate(now, 'Asia/Makassar', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Format baris header tabel dengan identitas visual Masjid Kuno Bayan
 * (Hijau tua alam Bayan #1b4332, teks putih tebal, baris pertama dibekukan)
 */
function formatHeaderRow_(sheet, columnCount) {
  var headerRange = sheet.getRange(1, 1, 1, columnCount);
  headerRange.setBackground('#1b4332');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  // Atur format teks default untuk baris-baris data berikutnya
  var maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, columnCount).setNumberFormat('@');
  }
}

/**
 * Helper untuk mendapatkan instance Spreadsheet baik saat container-bound
 * maupun saat standalone script dengan Script Property 'SPREADSHEET_ID'.
 */
function getTargetSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (propId) return SpreadsheetApp.openById(propId);
  throw new Error('Spreadsheet tidak ditemukan. Buka script dari menu Ekstensi > Apps Script di Spreadsheet terkait, atau atur Script Property SPREADSHEET_ID.');
}

/**
 * Alias helper kompatibilitas untuk getTargetSpreadsheet_
 */
function getSpreadsheet_() {
  return getTargetSpreadsheet_();
}

/**
 * FUNGSI UTAMA: Inisialisasi Database BAYAN VISITOR
 * Jalankan fungsi ini langsung dari Google Apps Script Editor.
 */
function initializeBayanDatabase() {
  var ss = getTargetSpreadsheet_();

  Logger.log('=== MEMULAI INISIALISASI DATABASE BAYAN VISITOR ===');
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Nama Spreadsheet: ' + ss.getName());

  var sheetNames = Object.keys(BAYAN_SCHEMA);
  var createdCount = 0;
  var existingCount = 0;
  var timestamp = getWitaTimestamp_();

  // 1. Buat atau perbarui setiap sheet dan pasang headernya
  sheetNames.forEach(function(sheetName) {
    var headers = BAYAN_SCHEMA[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      createdCount++;
      Logger.log('[BARU] Sheet dibuat: ' + sheetName);
    } else {
      existingCount++;
      Logger.log('[ADA] Sheet sudah ada: ' + sheetName);
    }

    // Set header kolom pada Baris 1
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    formatHeaderRow_(sheet, headers.length);

    // Auto-fit / rapikan lebar kolom
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
      // Berikan batas minimum lebar kolom agar rapi
      if (sheet.getColumnWidth(col) < 140) {
        sheet.setColumnWidth(col, 150);
      }
    }
  });

  // 2. Isi Data Produk Awal jika sheet PRODUK masih kosong
  var productSheet = ss.getSheetByName('PRODUK');
  if (productSheet && productSheet.getLastRow() === 1) {
    Logger.log('Mengisi data produk awal (Kain Poleng & Kain Batik)...');
    var productRows = INITIAL_PRODUCTS.map(function(item) {
      return [
        item.product_id,
        item.kode_produk,
        item.nama_produk,
        item.kategori,
        item.harga_sewa,
        item.satuan,
        item.deskripsi,
        item.status,
        timestamp, // dibuat_pada
        timestamp  // diperbarui_pada
      ];
    });
    productSheet.getRange(2, 1, productRows.length, BAYAN_SCHEMA.PRODUK.length).setValues(productRows);
    Logger.log('[SUKSES] ' + productRows.length + ' produk awal berhasil dimasukkan.');
  } else {
    Logger.log('[INFO] Sheet PRODUK sudah memiliki data, melewati pengisian awal.');
  }

  // 3. Isi Data Pengaturan Awal jika sheet PENGATURAN masih kosong
  var settingSheet = ss.getSheetByName('PENGATURAN');
  if (settingSheet && settingSheet.getLastRow() === 1) {
    Logger.log('Mengisi konfigurasi sistem awal pada PENGATURAN...');
    var settingRows = INITIAL_SETTINGS.map(function(item) {
      return [
        item.setting_id,
        item.nama_pengaturan,
        item.nilai,
        item.keterangan,
        timestamp // diperbarui_pada
      ];
    });
    settingSheet.getRange(2, 1, settingRows.length, BAYAN_SCHEMA.PENGATURAN.length).setValues(settingRows);
    Logger.log('[SUKSES] ' + settingRows.length + ' pengaturan sistem berhasil dimasukkan.');
  } else {
    Logger.log('[INFO] Sheet PENGATURAN sudah memiliki data, melewati pengisian awal.');
  }

  // 4. Catat Log Aktivitas Inisialisasi Database
  var logSheet = ss.getSheetByName('LOG_AKTIVITAS');
  if (logSheet) {
    var initLogId = 'LOG-' + Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyyMMdd-0001');
    logSheet.appendRow([
      initLogId,
      'SISTEM',
      'INIT_DATABASE',
      'DATABASE',
      ss.getId(),
      timestamp,
      'Inisialisasi 11 sheet skema database BAYAN VISITOR berhasil dilakukan.'
    ]);
  }

  // 5. Hapus sheet bawaan (Sheet1 / Sheet 1) jika masih ada dan kosong
  var defaultSheetNames = ['Sheet1', 'Sheet 1', 'Sheet1_id'];
  defaultSheetNames.forEach(function(defName) {
    var defSheet = ss.getSheetByName(defName);
    if (defSheet && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(defSheet);
        Logger.log('[BERSIH] Sheet bawaan kosong (' + defName + ') berhasil dihapus.');
      } catch (e) {
        Logger.log('[PERINGATAN] Tidak dapat menghapus sheet default: ' + e.message);
      }
    }
  });

  Logger.log('=== INISIALISASI DATABASE SELESAI ===');
  Logger.log('Total Sheet: ' + sheetNames.length + ' | Sheet Baru: ' + createdCount + ' | Sheet Eksis: ' + existingCount);

  return {
    success: true,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheetsConfigured: sheetNames.length,
    timestamp: timestamp
  };
}

/**
 * Inisialisasi Akun Super Admin Perdana
 * Jalankan fungsi ini dari editor Apps Script untuk membuat akun Super Admin awal:
 * - Email: admin@bayan.id
 * - Password: Bayan2026!Sec
 */
function initSuperAdmin() {
  var ss = getTargetSpreadsheet_();
  var adminSheet = ss.getSheetByName('ADMIN');
  if (!adminSheet) {
    Logger.log('[ERROR] Sheet ADMIN belum ada. Jalankan initializeBayanDatabase() terlebih dahulu.');
    return { success: false, message: 'Sheet ADMIN belum ada. Jalankan initializeBayanDatabase() terlebih dahulu.' };
  }

  var data = adminSheet.getDataRange().getValues();
  if (data.length > 1) {
    Logger.log('[INFO] Sheet ADMIN sudah memiliki data akun (' + (data.length - 1) + ' akun). Bootstrap dilewati.');
    return { success: false, message: 'Sheet ADMIN sudah terisi.' };
  }

  // Hash password menggunakan format salt:hash SHA-256 agar kompatibel dengan Utils.verifyPassword
  var rawPassword = 'Bayan2026!Sec';
  var salt = 'bayan_salt_2026';
  var passwordHash = '';
  
  if (typeof Utils !== 'undefined' && Utils.hashPassword) {
    passwordHash = Utils.hashPassword(rawPassword, salt);
  } else {
    var combined = salt + ':' + rawPassword;
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
    var hashHex = digest.map(function(b) {
      return ('0' + (b & 0xFF).toString(16)).slice(-2);
    }).join('');
    passwordHash = salt + ':' + hashHex;
  }

  var timestamp = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');
  var newAdminRow = [
    'ADM-001',
    'Super Admin Bayan',
    'admin@bayan.id',
    passwordHash,
    'SUPER_ADMIN',
    'AKTIF',
    timestamp,
    '-'
  ];

  adminSheet.appendRow(newAdminRow);
  Logger.log('[SUKSES] Akun Super Admin awal berhasil dibuat: admin@bayan.id / Bayan2026!Sec');
  return { success: true, email: 'admin@bayan.id', message: 'Super admin berhasil dibuat.' };
}
