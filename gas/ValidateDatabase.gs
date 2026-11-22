/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Validasi Integritas Struktur Database Google Spreadsheet
 * File: gas/ValidateDatabase.gs
 * ============================================================================
 * 
 * Script ini digunakan untuk menguji dan memvalidasi secara menyeluruh apakah
 * Google Spreadsheet yang terhubung memiliki 11 sheet yang sesuai spesifikasi,
 * urutan kolom yang 100% cocok, dan data awal produk serta pengaturan yang valid.
 */

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
 * FUNGSI UTAMA: Validasi Struktur Database BAYAN VISITOR
 * Jalankan fungsi ini untuk memverifikasi kesiapan database.
 */
function validateBayanDatabase() {
  var ss = getTargetSpreadsheet_();

  Logger.log('====================================================');
  Logger.log('  MEMULAI VALIDASI STRUKTUR DATABASE BAYAN VISITOR  ');
  Logger.log('====================================================');
  Logger.log('Spreadsheet ID   : ' + ss.getId());
  Logger.log('Spreadsheet Name : ' + ss.getName());

  var requiredSheets = typeof BAYAN_SCHEMA !== 'undefined' ? BAYAN_SCHEMA : {
    ADMIN: ['admin_id', 'nama', 'email', 'password_hash', 'role', 'status', 'dibuat_pada', 'terakhir_login'],
    PENGUNJUNG: ['visitor_id', 'nama_pengunjung', 'jenis_pengunjung', 'negara', 'provinsi', 'kabupaten_kota', 'nomor_telepon', 'asal_instansi', 'dibuat_pada'],
    KUNJUNGAN: ['visit_id', 'visitor_id', 'tanggal_kunjungan', 'waktu_kunjungan', 'jumlah_dewasa', 'jumlah_anak', 'total_pengunjung', 'tujuan_kunjungan', 'bahasa', 'persetujuan_data', 'status_kunjungan'],
    PRODUK: ['product_id', 'kode_produk', 'nama_produk', 'kategori', 'harga_sewa', 'satuan', 'deskripsi', 'status', 'dibuat_pada', 'diperbarui_pada'],
    INVENTARIS: ['inventory_id', 'product_id', 'kode_barang', 'kondisi', 'status', 'tanggal_masuk', 'keterangan'],
    TRANSAKSI: ['transaction_id', 'visit_id', 'tanggal_transaksi', 'total_barang', 'total_harga', 'status_transaksi', 'status_pembayaran', 'petugas_id', 'dibuat_pada'],
    DETAIL_TRANSAKSI: ['detail_id', 'transaction_id', 'inventory_id', 'product_id', 'nama_produk_snapshot', 'harga_snapshot', 'jumlah', 'subtotal'],
    PEMBAYARAN: ['payment_id', 'transaction_id', 'metode_pembayaran', 'jumlah_bayar', 'status_pembayaran', 'referensi_gateway', 'waktu_pembayaran', 'diverifikasi_oleh'],
    PENGEMBALIAN: ['return_id', 'transaction_id', 'inventory_id', 'waktu_pengembalian', 'kondisi_pengembalian', 'status_pengembalian', 'petugas_id', 'keterangan'],
    LOG_AKTIVITAS: ['log_id', 'admin_id', 'aktivitas', 'objek', 'objek_id', 'waktu', 'keterangan'],
    PENGATURAN: ['setting_id', 'nama_pengaturan', 'nilai', 'keterangan', 'diperbarui_pada']
  };

  var sheetNames = Object.keys(requiredSheets);
  var totalSheets = sheetNames.length;
  var passedSheets = 0;
  var issues = [];
  var sheetReports = [];

  sheetNames.forEach(function(sheetName) {
    var expectedColumns = requiredSheets[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      issues.push('Sheet [' + sheetName + '] TIDAK DITEMUKAN di Spreadsheet.');
      sheetReports.push({
        sheet: sheetName,
        status: 'MISSING',
        error: 'Sheet tidak ditemukan'
      });
      Logger.log('[GAGAL] Sheet ' + sheetName + ': TIDAK DITEMUKAN!');
      return;
    }

    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) {
      issues.push('Sheet [' + sheetName + '] KOSONG tanpa header kolom.');
      sheetReports.push({
        sheet: sheetName,
        status: 'EMPTY',
        error: 'Tidak memiliki header kolom'
      });
      Logger.log('[GAGAL] Sheet ' + sheetName + ': KOSONG!');
      return;
    }

    var actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var columnErrors = [];

    // Periksa jumlah kolom
    if (actualHeaders.length !== expectedColumns.length) {
      columnErrors.push('Jumlah kolom tidak cocok. Harapan: ' + expectedColumns.length + ', Aktual: ' + actualHeaders.length);
    }

    // Periksa setiap kolom dan urutannya
    for (var i = 0; i < expectedColumns.length; i++) {
      var expectedCol = expectedColumns[i];
      var actualCol = actualHeaders[i] ? String(actualHeaders[i]).trim() : '';

      if (actualCol !== expectedCol) {
        columnErrors.push('Kolom ke-' + (i + 1) + ' keliru. Harapan: "' + expectedCol + '", Aktual: "' + actualCol + '"');
      }
    }

    if (columnErrors.length === 0) {
      passedSheets++;
      sheetReports.push({
        sheet: sheetName,
        status: 'VALID',
        columnsCount: actualHeaders.length,
        rowsCount: sheet.getLastRow()
      });
      Logger.log('[LULUS] Sheet ' + sheetName + ' (' + actualHeaders.length + ' kolom, ' + sheet.getLastRow() + ' baris)');
    } else {
      issues.push('Sheet [' + sheetName + '] memiliki kesalahan kolom: ' + columnErrors.join('; '));
      sheetReports.push({
        sheet: sheetName,
        status: 'INVALID_COLUMNS',
        errors: columnErrors,
        expected: expectedColumns,
        actual: actualHeaders
      });
      Logger.log('[GAGAL] Sheet ' + sheetName + ' memiliki kesalahan: ' + columnErrors.join(' | '));
    }
  });

  // Validasi Data Produk Awal (Kain Poleng & Kain Batik)
  var productValidation = {
    kainPolengFound: false,
    kainBatikFound: false,
    details: []
  };

  var productSheet = ss.getSheetByName('PRODUK');
  if (productSheet && productSheet.getLastRow() > 1) {
    var productValues = productSheet.getRange(2, 1, productSheet.getLastRow() - 1, productSheet.getLastColumn()).getValues();
    productValues.forEach(function(row) {
      var prodId = String(row[0]).trim();
      var prodCode = String(row[1]).trim();
      var prodName = String(row[2]).trim();
      var prodPrice = Number(row[4]);

      if (prodCode === 'POL' || prodId === 'PRD-POL') {
        productValidation.kainPolengFound = true;
        productValidation.details.push('Kain Poleng: ' + prodName + ' (Rp' + prodPrice.toLocaleString('id-ID') + ') - OK');
      }
      if (prodCode === 'BAT' || prodId === 'PRD-BAT') {
        productValidation.kainBatikFound = true;
        productValidation.details.push('Kain Batik: ' + prodName + ' (Rp' + prodPrice.toLocaleString('id-ID') + ') - OK');
      }
    });
  }

  if (!productValidation.kainPolengFound) {
    issues.push('Produk awal "Kain Poleng" (POL, Rp20.000) belum terdaftar di sheet PRODUK.');
  }
  if (!productValidation.kainBatikFound) {
    issues.push('Produk awal "Kain Batik" (BAT, Rp10.000) belum terdaftar di sheet PRODUK.');
  }

  // Validasi Sheet Pengaturan
  var settingValidation = {
    settingsCount: 0,
    hasTimeZone: false
  };
  var settingSheet = ss.getSheetByName('PENGATURAN');
  if (settingSheet && settingSheet.getLastRow() > 1) {
    settingValidation.settingsCount = settingSheet.getLastRow() - 1;
    var settingValues = settingSheet.getRange(2, 2, settingValidation.settingsCount, 2).getValues();
    settingValues.forEach(function(row) {
      if (String(row[0]).trim() === 'zona_waktu' && String(row[1]).indexOf('Makassar') !== -1) {
        settingValidation.hasTimeZone = true;
      }
    });
  }

  var isAllValid = (passedSheets === totalSheets) && issues.length === 0;

  Logger.log('----------------------------------------------------');
  Logger.log('Hasil Validasi: ' + (isAllValid ? 'SEMUA 100% LULUS' : 'DITEMUKAN MASALAH'));
  Logger.log('Sheet Valid: ' + passedSheets + ' / ' + totalSheets);
  Logger.log('Data Produk Awal: ' + productValidation.details.join(', '));
  Logger.log('Pengaturan Terdeteksi: ' + settingValidation.settingsCount + ' entri (Zona Waktu WITA: ' + settingValidation.hasTimeZone + ')');
  if (issues.length > 0) {
    Logger.log('Daftar Isu:');
    issues.forEach(function(iss, idx) {
      Logger.log('  ' + (idx + 1) + '. ' + iss);
    });
  }
  Logger.log('====================================================');

  var result = {
    success: isAllValid,
    status: isAllValid ? 'SELESAI DAN LULUS PENGUJIAN' : 'PERLU PERBAIKAN',
    totalSheets: totalSheets,
    passedSheets: passedSheets,
    productValidation: productValidation,
    settingValidation: settingValidation,
    issues: issues,
    sheetReports: sheetReports,
    timestamp: new Date().toISOString()
  };

  return result;
}
