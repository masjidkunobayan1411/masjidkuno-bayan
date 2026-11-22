/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Database Abstraction Layer (DAL) & Concurrency Lock
 * File: gas/Database.gs
 * ============================================================================
 * 
 * Modul ini menyediakan antarmuka akses terpadu ke Google Spreadsheet dengan
 * mekanisme transaksi terkunci (LockService) guna mencegah race condition pada
 * inventaris dan transaksi keuangan, serta pemetaan objek otomatis berdasarkan
 * skema header kolom resmi.
 */

var Database = (function() {
  var cachedSpreadsheet_ = null;
  var cachedHeaders_ = {};

  /**
   * Mengambil instance Spreadsheet aktif atau berdasarkan Spreadsheet ID
   */
  function getSpreadsheet() {
    if (cachedSpreadsheet_) return cachedSpreadsheet_;

    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      cachedSpreadsheet_ = activeSs;
      return cachedSpreadsheet_;
    }

    var propId = getDatabaseSpreadsheetId();
    if (propId) {
      cachedSpreadsheet_ = SpreadsheetApp.openById(propId);
      return cachedSpreadsheet_;
    }

    throw new Error('Spreadsheet database tidak ditemukan. Atur Script Property SPREADSHEET_ID.');
  }

  /**
   * Mengambil instance Sheet berdasarkan nama tabel
   */
  function getSheet(sheetName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      // Otomatis buat sheet baru jika tabel terdaftar pada BAYAN_SCHEMA (misal PAYMENTS & WEBHOOK_LOGS)
      if (typeof BAYAN_SCHEMA !== 'undefined' && BAYAN_SCHEMA[sheetName]) {
        sheet = ss.insertSheet(sheetName);
        var headers = BAYAN_SCHEMA[sheetName];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        if (typeof formatHeaderRow_ === 'function') {
          formatHeaderRow_(sheet, headers.length);
        }
        return sheet;
      }
      throw new Error('Tabel/Sheet [' + sheetName + '] tidak ditemukan pada database.');
    }
    return sheet;
  }

  /**
   * Mengambil daftar header kolom dari baris 1 (dengan in-memory caching)
   */
  function getHeaders(sheetName) {
    if (cachedHeaders_[sheetName]) {
      return cachedHeaders_[sheetName];
    }

    var sheet = getSheet(sheetName);
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) {
      throw new Error('Tabel [' + sheetName + '] belum memiliki header kolom.');
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h).trim();
    });
    cachedHeaders_[sheetName] = headers;
    return headers;
  }

  /**
   * Eksekusi blok kode dengan Kunci Eksklusif (Exclusive Lock)
   * Wajib digunakan pada operasi penambahan transaksi, perubahan status inventaris,
   * dan pelunasan pembayaran guna mencegah double-booking.
   */
  function withLock(callback, customTimeoutMs) {
    var lock = LockService.getScriptLock();
    var timeout = customTimeoutMs || CONFIG.LOCK_TIMEOUT_MS;
    var acquired = false;

    try {
      acquired = lock.tryLock(timeout);
      if (!acquired) {
        throw new Error('Sistem sedang sibuk memproses transaksi lain. Silakan coba beberapa saat lagi.');
      }
      return callback();
    } finally {
      if (acquired) {
        lock.releaseLock();
      }
    }
  }

  /**
   * Mengambil semua record dari sheet dan mengubahnya menjadi array objek
   */
  function findAll(sheetName, filterFn) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }

    var headers = getHeaders(sheetName);
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var records = [];

    for (var r = 0; r < values.length; r++) {
      var row = values[r];
      var item = { _rowIndex: r + 2 };
      var isEmptyRow = true;

      for (var c = 0; c < headers.length; c++) {
        var val = row[c];
        if (val !== '' && val !== null && val !== undefined) {
          isEmptyRow = false;
        }

        // Sanitasi nilai Date/Time dari Google Spreadsheet
        if (val instanceof Date) {
          if (val.getFullYear() <= 1900) {
            // Nilai waktu murni tanpa tanggal (misal 11:28:39)
            val = Utilities.formatDate(val, CONFIG.TIMEZONE, CONFIG.TIME_FORMAT);
          } else {
            val = Utilities.formatDate(val, CONFIG.TIMEZONE, CONFIG.DATETIME_FORMAT);
          }
        }

        item[headers[c]] = val;
      }

      if (!isEmptyRow) {
        if (!filterFn || filterFn(item)) {
          records.push(item);
        }
      }
    }

    return records;
  }

  /**
   * Mencari record berdasarkan Primary Key (kolom pertama)
   */
  function findById(sheetName, idValue) {
    if (!idValue) return null;
    var headers = getHeaders(sheetName);
    var primaryKey = headers[0]; // Kolom pertama selalu Primary Key sesuai skema

    var results = findAll(sheetName, function(item) {
      return String(item[primaryKey]).trim() === String(idValue).trim();
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Menyimpan record baru ke sheet dengan pemetaan kolom otomatis
   */
  function insert(sheetName, recordData) {
    return withLock(function() {
      var sheet = getSheet(sheetName);
      var headers = getHeaders(sheetName);
      var primaryKey = headers[0];
      var lastRow = sheet.getLastRow();

      var dataToInsert = Object.assign({}, recordData);

      // Auto-generate Primary Key jika belum diisi
      if (!dataToInsert[primaryKey]) {
        var prefix = CONFIG.ID_PREFIX[sheetName] || 'REC';
        dataToInsert[primaryKey] = Utils.generateId(prefix, lastRow);
      }

      // Auto-populate timestamp 'dibuat_pada' jika kolom tersedia dan belum ada
      if (headers.indexOf('dibuat_pada') !== -1 && !dataToInsert['dibuat_pada']) {
        dataToInsert['dibuat_pada'] = Utils.getNowWitaIsoString();
      }

      // Auto-populate timestamp 'diperbarui_pada' jika kolom tersedia dan belum ada
      if (headers.indexOf('diperbarui_pada') !== -1 && !dataToInsert['diperbarui_pada']) {
        dataToInsert['diperbarui_pada'] = Utils.getNowWitaIsoString();
      }

      // Susun baris sesuai urutan header kolom
      var rowValues = [];
      for (var i = 0; i < headers.length; i++) {
        var colName = headers[i];
        var val = dataToInsert[colName];
        if (val === undefined || val === null) {
          val = '';
        }
        // Sanitasi nilai teks untuk proteksi formula injection
        rowValues.push(Utils.sanitize(val));
      }

      sheet.appendRow(rowValues);
      SpreadsheetApp.flush();

      dataToInsert._rowIndex = sheet.getLastRow();
      return dataToInsert;
    });
  }

  /**
   * Memperbarui record berdasarkan ID (Primary Key)
   */
  function updateById(sheetName, idValue, updateData) {
    return withLock(function() {
      var target = findById(sheetName, idValue);
      if (!target) {
        throw new Error('Data dengan ID [' + idValue + '] tidak ditemukan pada tabel ' + sheetName);
      }

      var sheet = getSheet(sheetName);
      var headers = getHeaders(sheetName);
      var rowIndex = target._rowIndex;

      // Auto-populate timestamp 'diperbarui_pada' jika kolom ada
      if (headers.indexOf('diperbarui_pada') !== -1 && !updateData['diperbarui_pada']) {
        updateData['diperbarui_pada'] = Utils.getNowWitaIsoString();
      }

      // Perbarui setiap cell yang diberikan nilainya
      for (var colName in updateData) {
        if (updateData.hasOwnProperty(colName) && colName !== '_rowIndex') {
          var colIndex = headers.indexOf(colName);
          if (colIndex !== -1) {
            var sanitizedVal = Utils.sanitize(updateData[colName]);
            sheet.getRange(rowIndex, colIndex + 1).setValue(sanitizedVal);
            target[colName] = sanitizedVal;
          }
        }
      }

      SpreadsheetApp.flush();
      return target;
    });
  }

  /**
   * Soft Delete: Menonaktifkan record tanpa menghapus data secara permanen
   */
  function softDelete(sheetName, idValue, statusColumnName, deletedStatusValue) {
    var updateObj = {};
    updateObj[statusColumnName || 'status'] = deletedStatusValue || 'NONAKTIF';
    return updateById(sheetName, idValue, updateObj);
  }

  /**
   * Hard Delete: Menghapus baris record secara permanen dari spreadsheet
   */
  function deleteById(sheetName, idValue) {
    return withLock(function() {
      var target = findById(sheetName, idValue);
      if (!target) {
        throw new Error('Data dengan ID [' + idValue + '] tidak ditemukan pada tabel ' + sheetName);
      }
      var sheet = getSheet(sheetName);
      var rowIndex = target._rowIndex;
      sheet.deleteRow(rowIndex);
      SpreadsheetApp.flush();
      return target;
    });
  }

  return {
    getSpreadsheet: getSpreadsheet,
    getSheet: getSheet,
    getHeaders: getHeaders,
    withLock: withLock,
    findAll: findAll,
    findById: findById,
    insert: insert,
    updateById: updateById,
    softDelete: softDelete,
    deleteById: deleteById
  };
})();
