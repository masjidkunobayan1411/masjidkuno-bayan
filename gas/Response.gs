/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Standar Respons API (Response Formatter)
 * File: gas/Response.gs
 * ============================================================================
 */

var Response = (function() {
  /**
   * Menghasilkan timestamp saat ini dalam format ISO 8601 zona WITA
   */
  function getCurrentTimestamp_() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATETIME_FORMAT);
  }

  /**
   * Format standar respons berhasil
   */
  function success(data, message) {
    return {
      success: true,
      message: message || 'Operasi berhasil dilakukan',
      data: data !== undefined && data !== null ? data : {},
      timestamp: getCurrentTimestamp_()
    };
  }

  /**
   * Format standar respons gagal / error
   */
  function error(message, errors, data) {
    return {
      success: false,
      message: message || 'Terjadi kesalahan pada sistem',
      errors: Array.isArray(errors) ? errors : (errors ? [String(errors)] : []),
      data: data !== undefined && data !== null ? data : {},
      timestamp: getCurrentTimestamp_()
    };
  }

  /**
   * Mengonversi objek respons menjadi HTTP JSON TextOutput untuk Web App Apps Script
   */
  function toOutput(responseObj) {
    var jsonString = JSON.stringify(responseObj);
    return ContentService.createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  }

  return {
    success: success,
    error: error,
    toOutput: toOutput
  };
})();
