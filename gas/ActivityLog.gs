/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Audit Trail & Pencatatan Aktivitas Sistem
 * File: gas/ActivityLog.gs
 * ============================================================================
 * 
 * Modul ini mencatat seluruh peristiwa krusial (login, pendaftaran kunjungan,
 * pembuatan sewa, pelunasan pembayaran, pengembalian barang, dan perubahan
 * pengaturan) ke sheet LOG_AKTIVITAS sebagai jejak audit kepatuhan.
 */

var ActivityLog = (function() {
  /**
   * Mencatat satu entri riwayat aktivitas
   */
  function record(adminId, aktivitas, objek, objekId, keterangan) {
    try {
      var logData = {
        admin_id: adminId || 'SISTEM',
        aktivitas: String(aktivitas || 'AKSI_UMUM').toUpperCase(),
        objek: String(objek || '-').toUpperCase(),
        objek_id: String(objekId || '-'),
        waktu: Utils.getNowWitaIsoString(),
        keterangan: String(keterangan || '')
      };

      // Simpan langsung ke sheet LOG_AKTIVITAS
      Database.insert('LOG_AKTIVITAS', logData);
      return true;
    } catch (err) {
      Logger.log('[LOG_AKTIVITAS ERROR] Gagal menulis audit log: ' + err.message);
      // Jangan gagalkan alur utama hanya karena logging bermasalah
      return false;
    }
  }

  /**
   * Mengambil riwayat aktivitas terbaru dengan batas limit
   */
  function getRecent(limit) {
    var max = limit || 50;
    var logs = Database.findAll('LOG_AKTIVITAS');
    // Urutkan dari yang paling baru
    logs.sort(function(a, b) {
      return new Date(b.waktu) - new Date(a.waktu);
    });
    return logs.slice(0, max);
  }

  return {
    record: record,
    getRecent: getRecent
  };
})();
