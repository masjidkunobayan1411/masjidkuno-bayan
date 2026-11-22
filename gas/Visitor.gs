/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Data Pengunjung
 * File: gas/Visitor.gs
 * ============================================================================
 * 
 * Modul ini menangani validasi, penyimpanan, dan pencarian data identitas
 * pengunjung (domestik vs mancanegara) sesuai aturan bisnis sistem.
 */

var Visitor = (function() {
  /**
   * Validasi Input Data Pengunjung
   */
  function validateVisitorData_(data) {
    var errors = [];

    // 1. Validasi Nama Pengunjung
    if (!data.nama_pengunjung || typeof data.nama_pengunjung !== 'string' || data.nama_pengunjung.trim().length === 0) {
      errors.push('Nama pengunjung wajib diisi.');
    } else if (data.nama_pengunjung.trim().length < 2) {
      errors.push('Nama pengunjung minimal terdiri dari 2 karakter.');
    }

    // 2. Validasi Jenis Pengunjung
    var jenis = String(data.jenis_pengunjung || '').toUpperCase().trim();
    if (jenis !== 'DOMESTIK' && jenis !== 'MANCANEGARA') {
      errors.push('Jenis pengunjung harus dipilih antara DOMESTIK atau MANCANEGARA.');
    }

    // 3. Aturan Domestik vs Mancanegara
    if (jenis === 'DOMESTIK') {
      if (!data.provinsi || String(data.provinsi).trim().length === 0) {
        errors.push('Provinsi asal wajib diisi untuk pengunjung domestik.');
      }
      if (!data.kabupaten_kota || String(data.kabupaten_kota).trim().length === 0) {
        errors.push('Kabupaten/Kota asal wajib diisi untuk pengunjung domestik.');
      }
    } else if (jenis === 'MANCANEGARA') {
      if (!data.negara || String(data.negara).trim().length === 0) {
        errors.push('Negara asal wajib diisi untuk pengunjung mancanegara.');
      }
    }

    // 4. Validasi Nomor Telepon (Opsional, tapi jika diisi harus valid)
    if (data.nomor_telepon && String(data.nomor_telepon).trim().length > 0 && String(data.nomor_telepon).trim() !== '-') {
      if (!Utils.isValidPhone(data.nomor_telepon)) {
        errors.push('Format nomor telepon tidak valid. Gunakan format angka standar (contoh: 08123456789 atau +628123456789).');
      }
    }

    return errors;
  }

  /**
   * Membuat atau Mendaftarkan Pengunjung Baru
   */
  function createVisitor(payload) {
    var errors = validateVisitorData_(payload);
    if (errors.length > 0) {
      return Response.error('Validasi data pengunjung gagal', errors);
    }

    var jenis = String(payload.jenis_pengunjung).toUpperCase().trim();
    var negara = (jenis === 'DOMESTIK') ? 'INDONESIA' : String(payload.negara).trim().toUpperCase();
    var provinsi = (jenis === 'DOMESTIK') ? String(payload.provinsi).trim() : '-';
    var kabKota = (jenis === 'DOMESTIK') ? String(payload.kabupaten_kota).trim() : '-';

    var visitorRecord = {
      nama_pengunjung: payload.nama_pengunjung.trim(),
      jenis_pengunjung: jenis,
      negara: negara,
      provinsi: provinsi,
      kabupaten_kota: kabKota,
      nomor_telepon: payload.nomor_telepon ? String(payload.nomor_telepon).trim() : '-',
      asal_instansi: payload.asal_instansi ? String(payload.asal_instansi).trim() : '-'
    };

    var saved = Database.insert('PENGUNJUNG', visitorRecord);

    return Response.success(saved, 'Data pengunjung berhasil didaftarkan');
  }

  /**
   * Mengambil Detail Pengunjung Berdasarkan visitor_id
   */
  function getVisitorById(visitorId) {
    if (!visitorId) {
      return Response.error('visitor_id wajib disertakan');
    }

    var visitor = Database.findById('PENGUNJUNG', visitorId);
    if (!visitor) {
      return Response.error('Pengunjung dengan ID [' + visitorId + '] tidak ditemukan');
    }

    return Response.success(visitor, 'Detail data pengunjung');
  }

  /**
   * Mencari atau Menyaring Daftar Pengunjung (Untuk Kebutuhan Admin)
   */
  function findVisitors(query, limit) {
    var maxLimit = Number(limit) || 50;
    var q = query ? String(query).toLowerCase().trim() : '';

    var visitors = Database.findAll('PENGUNJUNG', function(item) {
      if (!q) return true;
      var nameMatch = String(item.nama_pengunjung || '').toLowerCase().indexOf(q) !== -1;
      var phoneMatch = String(item.nomor_telepon || '').toLowerCase().indexOf(q) !== -1;
      var idMatch = String(item.visitor_id || '').toLowerCase().indexOf(q) !== -1;
      var instansiMatch = String(item.asal_instansi || '').toLowerCase().indexOf(q) !== -1;
      return nameMatch || phoneMatch || idMatch || instansiMatch;
    });

    // Urutkan dari yang terbaru dibuat
    visitors.sort(function(a, b) {
      return new Date(b.dibuat_pada) - new Date(a.dibuat_pada);
    });

    return Response.success(visitors.slice(0, maxLimit), 'Daftar data pengunjung');
  }

  return {
    createVisitor: createVisitor,
    getVisitorById: getVisitorById,
    findVisitors: findVisitors,
    validateVisitorData_: validateVisitorData_
  };
})();
