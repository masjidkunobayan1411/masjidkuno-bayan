/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Utilitas, Generator ID, Sanitasi & Validasi
 * File: gas/Utils.gs
 * ============================================================================
 */

var Utils = (function() {
  /**
   * Menghasilkan string tanggal sekarang dalam zona WITA (YYYY-MM-DD)
   */
  function getTodayWitaString() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
  }

  /**
   * Menghasilkan string waktu sekarang dalam zona WITA (HH:mm:ss)
   */
  function getTimeWitaString() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.TIME_FORMAT);
  }

  /**
   * Menghasilkan string ISO 8601 waktu sekarang dalam zona WITA
   */
  function getNowWitaIsoString() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATETIME_FORMAT);
  }

  /**
   * Mengonversi Date object atau string waktu ke format WITA
   */
  function formatDateToWita(dateObj, pattern) {
    var date = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
    return Utilities.formatDate(date, CONFIG.TIMEZONE, pattern || CONFIG.DATETIME_FORMAT);
  }

  /**
   * Sanitasi string dan pencegahan Formula Injection pada Google Spreadsheet.
   * Nilai yang diawali tanda '=', '+', '-', '@' dinetralkan agar tidak dieksekusi sebagai rumus sheet.
   */
  function sanitize(val) {
    if (val === null || val === undefined) return '';
    if (typeof val !== 'string') return val;
    
    var trimmed = val.trim();
    if (trimmed.length === 0) return '';
    
    // Cegah formula injection pada spreadsheet
    var firstChar = trimmed.charAt(0);
    if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
      return "'" + trimmed;
    }
    return trimmed;
  }

  /**
   * Generator ID Unik Berurutan Berdasarkan Entitas dan Tanggal
   * Format: [PREFIX]-[YYYYMMDD]-[0001...] atau [PREFIX]-[KODE]
   * Contoh: VIS-20261106-0001, TRX-20261106-0001, PRD-POL
   */
  function generateId(prefix, sequenceNumber) {
    var datePart = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
    var seq = sequenceNumber || 1;
    var padded = ('0000' + seq).slice(-4);
    return prefix + '-' + datePart + '-' + padded;
  }

  /**
   * Generator ID Acak Unik untuk Nonce dan Transaksi Spesifik
   */
  function generateRandomId(prefix, length) {
    var len = length || 6;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var result = '';
    for (var i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    var datePart = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
    return prefix + '-' + datePart + '-' + result;
  }

  /**
   * Menghasilkan salt acak (hex string)
   */
  function generateSalt(length) {
    var len = length || 16;
    var chars = 'abcdef0123456789';
    var salt = '';
    for (var i = 0; i < len; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  /**
   * Hash password dengan SHA-256 + Salt
   * Format penyimpanan: salt:hash
   */
  function hashPassword(password, salt) {
    var useSalt = salt || generateSalt(16);
    var combined = useSalt + ':' + password;
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined);
    var hashHex = digest.map(function(b) {
      return ('0' + (b & 0xFF).toString(16)).slice(-2);
    }).join('');
    return useSalt + ':' + hashHex;
  }

  /**
   * Verifikasi password terhadap stored hash (salt:hash)
   */
  function verifyPassword(password, storedHash) {
    if (!storedHash || storedHash.indexOf(':') === -1) {
      return false;
    }
    var parts = storedHash.split(':');
    var salt = parts[0];
    var expectedHash = parts[1];
    var computed = hashPassword(password, salt).split(':')[1];
    return computed === expectedHash;
  }

  /**
   * Validasi Format Email
   */
  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  }

  /**
   * Validasi Nomor Telepon Indonesia / Internasional
   */
  function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    var cleaned = phone.replace(/[\s\-\(\)]/g, '');
    var regex = /^\+?[0-9]{8,16}$/;
    return regex.test(cleaned);
  }

  /**
   * Validasi Nilai Integer Positif (>= 0)
   */
  function isPositiveInteger(val) {
    var num = Number(val);
    return !isNaN(num) && Number.isInteger(num) && num >= 0;
  }

  /**
   * Ekstraksi string tanggal YYYY-MM-DD aman dari Date object, ISO string, atau teks sel
   */
  function extractDateString(val) {
    if (!val) return '';
    if (val instanceof Date) {
      return Utilities.formatDate(val, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    }
    var s = String(val).trim();
    if (s.indexOf('T') !== -1) {
      return s.split('T')[0];
    }
    var m = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    try {
      var d = new Date(s);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      }
    } catch(e) {}
    return s;
  }

  return {
    getTodayWitaString: getTodayWitaString,
    getTimeWitaString: getTimeWitaString,
    getNowWitaIsoString: getNowWitaIsoString,
    formatDateToWita: formatDateToWita,
    extractDateString: extractDateString,
    sanitize: sanitize,
    generateId: generateId,
    generateRandomId: generateRandomId,
    generateSalt: generateSalt,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    isPositiveInteger: isPositiveInteger
  };
})();
