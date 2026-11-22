/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Sesi Kunjungan
 * File: gas/Visit.gs
 * ============================================================================
 * 
 * Modul ini menangani pencatatan sesi kunjungan, auto-kalkulasi jumlah
 * pengunjung (dewasa + anak), validasi persetujuan data privasi, pencatatan waktu
 * server WITA, serta query agregasi kunjungan.
 */

var Visit = (function() {
  /**
   * Validasi Input Data Sesi Kunjungan
   */
  function validateVisitData_(data) {
    var errors = [];

    // 1. Validasi Jumlah Dewasa (Minimal 1)
    var dewasa = Number(data.jumlah_dewasa);
    if (isNaN(dewasa) || !Number.isInteger(dewasa) || dewasa < 1) {
      errors.push('Jumlah pengunjung dewasa minimal 1 orang.');
    }

    // 2. Validasi Jumlah Anak (Minimal 0)
    var anak = Number(data.jumlah_anak !== undefined && data.jumlah_anak !== null ? data.jumlah_anak : 0);
    if (isNaN(anak) || !Number.isInteger(anak) || anak < 0) {
      errors.push('Jumlah pengunjung anak-anak tidak boleh negatif.');
    }

    // 3. Validasi Tujuan Kunjungan
    if (!data.tujuan_kunjungan || String(data.tujuan_kunjungan).trim().length === 0) {
      errors.push('Tujuan kunjungan wajib diisi.');
    }

    // 4. Validasi Persetujuan Data Privasi
    var consent = data.persetujuan_data;
    if (consent !== true && consent !== 'true' && consent !== 1 && consent !== '1') {
      errors.push('Pengunjung wajib menyetujui ketentuan pemrosesan data kunjungan.');
    }

    // 5. Validasi Bahasa
    var lang = String(data.bahasa || 'ID').toUpperCase().trim();
    if (lang !== 'ID' && lang !== 'EN') {
      errors.push('Pilihan bahasa harus ID atau EN.');
    }

    return errors;
  }

  /**
   * Pendaftaran Mandiri Publik Terpadu (Atomic: Pengunjung + Kunjungan)
   * Menggunakan Database.withLock agar pendaftaran bersamaan tidak saling tumpang tindih.
   */
  function registerPublicVisit(payload) {
    return Database.withLock(function() {
      // 1. Validasi Data Pengunjung
      var visitorErrors = Visitor.validateVisitorData_(payload);
      // 2. Validasi Data Kunjungan
      var visitErrors = validateVisitData_(payload);
      var combinedErrors = visitorErrors.concat(visitErrors);

      if (combinedErrors.length > 0) {
        return Response.error('Pendaftaran gagal: Validasi formulir tidak terpenuhi', combinedErrors);
      }

      // 3. Simpan Data Pengunjung ke sheet PENGUNJUNG
      var visitorRes = Visitor.createVisitor(payload);
      if (!visitorRes.success) {
        return visitorRes;
      }
      var visitor = visitorRes.data;

      // 4. Hitung Total Pengunjung = Jumlah Dewasa + Jumlah Anak
      var jmlDewasa = Number(payload.jumlah_dewasa);
      var jmlAnak = Number(payload.jumlah_anak || 0);
      var totalPengunjung = jmlDewasa + jmlAnak;

      // 5. Susun Waktu Kunjungan dalam Zona Waktu WITA
      var tglKunjungan = payload.tanggal_kunjungan ? String(payload.tanggal_kunjungan).trim() : Utils.getTodayWitaString();
      var waktuKunjungan = Utils.getTimeWitaString();

      var visitRecord = {
        visitor_id: visitor.visitor_id,
        tanggal_kunjungan: tglKunjungan,
        waktu_kunjungan: waktuKunjungan,
        jumlah_dewasa: jmlDewasa,
        jumlah_anak: jmlAnak,
        total_pengunjung: totalPengunjung,
        tujuan_kunjungan: String(payload.tujuan_kunjungan).trim(),
        bahasa: String(payload.bahasa || 'ID').toUpperCase().trim(),
        persetujuan_data: true,
        status_kunjungan: CONFIG.STATUS.KUNJUNGAN.TERDAFTAR
      };

      // 6. Simpan Data Kunjungan ke sheet KUNJUNGAN
      var savedVisit = Database.insert('KUNJUNGAN', visitRecord);

      // 7. Catat ke Audit Log
      ActivityLog.record(
        'PUBLIK',
        'REGISTRASI_KUNJUNGAN',
        'KUNJUNGAN',
        savedVisit.visit_id,
        'Registrasi pengunjung: ' + visitor.nama_pengunjung + ' (' + totalPengunjung + ' orang: ' + jmlDewasa + ' dewasa, ' + jmlAnak + ' anak)'
      );

      // 8. Kembalikan Tiket Registrasi Lengkap
      var confirmationTicket = {
        visit_id: savedVisit.visit_id,
        visitor_id: visitor.visitor_id,
        nama_pengunjung: visitor.nama_pengunjung,
        jenis_pengunjung: visitor.jenis_pengunjung,
        asal: (visitor.jenis_pengunjung === 'DOMESTIK')
          ? (visitor.kabupaten_kota + ', ' + visitor.provinsi)
          : visitor.negara,
        nomor_telepon: visitor.nomor_telepon,
        asal_instansi: visitor.asal_instansi,
        tanggal_kunjungan: savedVisit.tanggal_kunjungan,
        waktu_kunjungan: savedVisit.waktu_kunjungan,
        jumlah_dewasa: savedVisit.jumlah_dewasa,
        jumlah_anak: savedVisit.jumlah_anak,
        total_pengunjung: savedVisit.total_pengunjung,
        tujuan_kunjungan: savedVisit.tujuan_kunjungan,
        bahasa: savedVisit.bahasa,
        status_kunjungan: savedVisit.status_kunjungan,
        dibuat_pada: savedVisit.dibuat_pada
      };

      return Response.success(confirmationTicket, 'Pendaftaran kunjungan berhasil dicatat');
    });
  }

  /**
   * Mengambil Detail Kunjungan Berdasarkan visit_id (Disertai Data Pengunjung)
   */
  function getVisitById(visitId) {
    if (!visitId) {
      return Response.error('visit_id wajib disertakan');
    }

    var visit = Database.findById('KUNJUNGAN', visitId);
    if (!visit) {
      return Response.error('Data kunjungan dengan ID [' + visitId + '] tidak ditemukan');
    }

    var visitor = Database.findById('PENGUNJUNG', visit.visitor_id) || {};

    var fullDetails = Object.assign({}, visit, {
      visitor: visitor,
      nama_pengunjung: visitor.nama_pengunjung || visitor.nama_lengkap || '',
      jenis_pengunjung: visitor.jenis_pengunjung || 'DOMESTIK',
      negara: visitor.negara || '',
      provinsi: visitor.provinsi || '',
      kabupaten_kota: visitor.kabupaten_kota || '',
      asal: (visitor.jenis_pengunjung === 'DOMESTIK')
        ? ((visitor.kabupaten_kota ? visitor.kabupaten_kota + ', ' : '') + (visitor.provinsi || 'Indonesia'))
        : (visitor.negara || 'Mancanegara'),
      nomor_telepon: visitor.nomor_telepon || '',
      asal_instansi: visitor.asal_instansi || ''
    });

    return Response.success(fullDetails, 'Detail data kunjungan');
  }

  /**
   * Mengambil Daftar Kunjungan dengan Filter & Pagination (Untuk Dashboard Admin)
   */
  function listVisits(filters, limit, offset) {
    var f = filters || {};
    var maxLimit = Number(limit) || 50;
    var skip = Number(offset) || 0;

    // Helper ekstraksi tanggal yang aman dari Date object maupun string sel
    function extractDateStr_(val) {
      if (!val) return '';
      if (val instanceof Date) {
        return Utilities.formatDate(val, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
      }
      var s = String(val).trim();
      if (s.indexOf('T') !== -1) return s.split('T')[0];
      var m = s.match(/^\d{4}-\d{2}-\d{2}/);
      if (m) return m[0];
      try {
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
          return Utilities.formatDate(d, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
        }
      } catch (e) {}
      return s;
    }

    // Ambil data kunjungan dan map pengunjung
    var visits = Database.findAll('KUNJUNGAN', function(item) {
      var itemDate = extractDateStr_(item.tanggal_kunjungan);

      // Filter Tanggal
      if (f.tanggal && itemDate !== f.tanggal) {
        return false;
      }
      if (f.start_date && itemDate < f.start_date) {
        return false;
      }
      if (f.end_date && itemDate > f.end_date) {
        return false;
      }
      // Filter Status
      if (f.status && f.status !== 'ALL') {
        var itemStatus = String(item.status_kunjungan || '').toUpperCase();
        var fStatus = String(f.status).toUpperCase();
        if (fStatus === 'TERVERIFIKASI') {
          if (itemStatus !== 'TERVERIFIKASI' && itemStatus !== 'CHECK-IN') return false;
        } else if (itemStatus !== fStatus) {
          return false;
        }
      }
      return true;
    });

    // Ambil seluruh pengunjung untuk proses join efisien
    var allVisitors = Database.findAll('PENGUNJUNG');
    var visitorMap = {};
    allVisitors.forEach(function(v) {
      visitorMap[v.visitor_id] = v;
    });

    // Gabungkan data kunjungan dengan profil pengunjung
    var enrichedVisits = [];
    for (var i = 0; i < visits.length; i++) {
      var item = visits[i];
      var vProfile = visitorMap[item.visitor_id] || {};

      // Filter berdasarkan jenis pengunjung jika ada
      if (f.jenis_pengunjung && vProfile.jenis_pengunjung !== f.jenis_pengunjung) {
        continue;
      }

      // Filter pencarian teks multi-field komprehensif
      if (f.search) {
        var s = String(f.search).toLowerCase().trim();
        var matchId = String(item.visit_id || '').toLowerCase().indexOf(s) !== -1;
        var matchVisitorId = String(item.visitor_id || '').toLowerCase().indexOf(s) !== -1;
        var matchName = String(vProfile.nama_pengunjung || vProfile.nama_lengkap || '').toLowerCase().indexOf(s) !== -1;
        var matchInstansi = String(vProfile.asal_instansi || '').toLowerCase().indexOf(s) !== -1;
        var matchPhone = String(vProfile.nomor_telepon || '').toLowerCase().indexOf(s) !== -1;
        var matchKota = String(vProfile.kabupaten_kota || '').toLowerCase().indexOf(s) !== -1;
        var matchProv = String(vProfile.provinsi || '').toLowerCase().indexOf(s) !== -1;
        var matchNegara = String(vProfile.negara || '').toLowerCase().indexOf(s) !== -1;
        var matchTujuan = String(item.tujuan_kunjungan || '').toLowerCase().indexOf(s) !== -1;
        var matchCatatan = String(item.catatan || '').toLowerCase().indexOf(s) !== -1;
        var matchStatus = String(item.status_kunjungan || '').toLowerCase().indexOf(s) !== -1;

        if (!matchId && !matchVisitorId && !matchName && !matchInstansi && !matchPhone && !matchKota && !matchProv && !matchNegara && !matchTujuan && !matchCatatan && !matchStatus) {
          continue;
        }
      }

      enrichedVisits.push(Object.assign({}, item, {
        nama_pengunjung: vProfile.nama_pengunjung || vProfile.nama_lengkap || '-',
        jenis_pengunjung: vProfile.jenis_pengunjung || '-',
        negara: vProfile.negara || '-',
        provinsi: vProfile.provinsi || '-',
        kabupaten_kota: vProfile.kabupaten_kota || '-',
        asal_instansi: vProfile.asal_instansi || '-',
        nomor_telepon: vProfile.nomor_telepon || '-'
      }));
    }

    // Urutkan dari yang terbaru (tanggal + waktu atau dibuat_pada)
    enrichedVisits.sort(function(a, b) {
      var timeA = new Date(a.dibuat_pada || a.tanggal_kunjungan);
      var timeB = new Date(b.dibuat_pada || b.tanggal_kunjungan);
      return timeB - timeA;
    });

    var totalCount = enrichedVisits.length;
    var paginatedItems = enrichedVisits.slice(skip, skip + maxLimit);

    return Response.success({
      items: paginatedItems,
      total: totalCount,
      limit: maxLimit,
      offset: skip
    }, 'Daftar sesi kunjungan');
  }

  /**
   * Memperbarui Status Kunjungan (TERDAFTAR -> SELESAI / BATAL)
   */
  function updateVisitStatus(visitId, newStatus, adminId) {
    if (!visitId || !newStatus) {
      return Response.error('visit_id dan newStatus wajib disertakan');
    }

    var validStatuses = [
      CONFIG.STATUS.KUNJUNGAN.TERDAFTAR,
      CONFIG.STATUS.KUNJUNGAN.TERVERIFIKASI,
      'CHECK-IN',
      CONFIG.STATUS.KUNJUNGAN.SELESAI,
      CONFIG.STATUS.KUNJUNGAN.BATAL
    ];

    if (validStatuses.indexOf(newStatus) === -1) {
      return Response.error('Status kunjungan tidak valid. Pilihan: ' + validStatuses.join(', '));
    }

    var updated = Database.updateById('KUNJUNGAN', visitId, {
      status_kunjungan: newStatus
    });

    ActivityLog.record(
      adminId || 'ADMIN',
      'UPDATE_STATUS_KUNJUNGAN',
      'KUNJUNGAN',
      visitId,
      'Perubahan status kunjungan menjadi ' + newStatus
    );

    return Response.success(updated, 'Status kunjungan berhasil diperbarui');
  }

  return {
    validateVisitData_: validateVisitData_,
    registerPublicVisit: registerPublicVisit,
    getVisitById: getVisitById,
    listVisits: listVisits,
    updateVisitStatus: updateVisitStatus
  };
})();
