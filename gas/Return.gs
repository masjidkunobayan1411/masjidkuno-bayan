/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Pengembalian Pakaian Adat
 * File: gas/Return.gs
 * ============================================================================
 * 
 * Modul ini menangani penerimaan kembali pakaian adat yang disewa, inspeksi
 * kondisi fisik pasca-sewa, rekonsiliasi status unit fisik (TERSEDIA / PERAWATAN
 * / RUSAK / HILANG), penyelesaian otomatis status transaksi, dan pencatatan audit.
 */

var Return = (function() {
  var VALID_RETURN_CONDITIONS = [
    'BAIK',
    'KOTOR_RINGAN',
    'RUSAK_RINGAN',
    'RUSAK_BERAT',
    'HILANG'
  ];

  /**
   * Menentukan Status Inventaris Baru Berdasarkan Kondisi Pengembalian
   */
  function determineNewInventoryStatus_(kondisi) {
    switch (kondisi) {
      case 'BAIK':
      case 'KOTOR_RINGAN':
        return CONFIG.STATUS.INVENTARIS.TERSEDIA;
      case 'RUSAK_RINGAN':
        return CONFIG.STATUS.INVENTARIS.PERAWATAN;
      case 'RUSAK_BERAT':
        return CONFIG.STATUS.INVENTARIS.RUSAK;
      case 'HILANG':
        return CONFIG.STATUS.INVENTARIS.HILANG;
      default:
        return CONFIG.STATUS.INVENTARIS.TERSEDIA;
    }
  }

  /**
   * Memproses Pengembalian Satu atau Lebih Unit Pakaian Adat
   * 
   * Payload:
   * {
   *   "transaction_id": "TRX-...",
   *   "items": [
   *     {
   *       "inventory_id": "INV-...",
   *       "kondisi_pengembalian": "BAIK",
   *       "keterangan": "Kain bersih rapi"
   *     },
   *     ...
   *   ]
   * }
   */
  function processReturn(payload, adminId) {
    var trxId = payload.transaction_id;
    var petugas = adminId || payload.petugas_id || 'PETUGAS';

    if (!trxId) {
      return Response.error('transaction_id wajib disertakan.');
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return Response.error('Daftar barang yang dikembalikan (items) tidak boleh kosong.');
    }

    return Database.withLock(function() {
      // 1. Verifikasi Keberadaan Transaksi
      var trx = Database.findById('TRANSAKSI', trxId);
      if (!trx) {
        return Response.error('Transaksi [' + trxId + '] tidak ditemukan.');
      }

      if (trx.status_transaksi === CONFIG.STATUS.TRANSAKSI.SELESAI) {
        return Response.error('Seluruh barang pada transaksi [' + trxId + '] telah selesai dikembalikan sebelumnya.');
      }
      if (trx.status_transaksi === CONFIG.STATUS.TRANSAKSI.DIBATALKAN) {
        return Response.error('Transaksi [' + trxId + '] telah DIBATALKAN.');
      }

      // 2. Ambil Seluruh DETAIL_TRANSAKSI
      var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
        return d.transaction_id === trxId;
      });

      var detailMap = {};
      details.forEach(function(d) {
        detailMap[d.inventory_id] = d;
      });

      // 3. Ambil Histori PENGEMBALIAN yang Sudah Ada (Mencegah Double-Return)
      var existingReturns = Database.findAll('PENGEMBALIAN', function(r) {
        return r.transaction_id === trxId;
      });

      var alreadyReturnedMap = {};
      existingReturns.forEach(function(r) {
        alreadyReturnedMap[r.inventory_id] = true;
      });

      var savedReturns = [];
      var nowWita = Utils.getNowWitaIsoString();

      // 4. Proses Setiap Item yang Dikembalikan
      for (var i = 0; i < payload.items.length; i++) {
        var itemData = payload.items[i];
        var invId = itemData.inventory_id;
        var kondisi = String(itemData.kondisi_pengembalian || 'BAIK').toUpperCase().trim();
        var ket = itemData.keterangan ? String(itemData.keterangan).trim() : '-';

        if (!invId) {
          return Response.error('Setiap baris barang wajib memuat inventory_id.');
        }

        // Pastikan barang ini memang disewa pada transaksi ini
        if (!detailMap[invId]) {
          return Response.error('Unit fisik [' + invId + '] bukan bagian dari transaksi [' + trxId + '].');
        }

        // Cegah pengembalian ganda
        if (alreadyReturnedMap[invId]) {
          return Response.error('Unit fisik [' + invId + '] sudah tercatat pernah dikembalikan sebelumnya.');
        }

        if (VALID_RETURN_CONDITIONS.indexOf(kondisi) === -1) {
          return Response.error('Kondisi pengembalian [' + kondisi + '] tidak valid. Pilihan: ' + VALID_RETURN_CONDITIONS.join(', '));
        }

        // Tentukan status inventaris pasca-kembali
        var newInvStatus = determineNewInventoryStatus_(kondisi);
        var statusPengembalian = (kondisi === 'RUSAK_BERAT' || kondisi === 'HILANG')
          ? CONFIG.STATUS.PENGEMBALIAN.PERLU_TINDAK_LANJUT
          : CONFIG.STATUS.PENGEMBALIAN.SELESAI;

        // Simpan ke sheet PENGEMBALIAN
        var returnRecord = {
          transaction_id: trxId,
          inventory_id: invId,
          waktu_pengembalian: nowWita,
          kondisi_pengembalian: kondisi,
          status_pengembalian: statusPengembalian,
          petugas_id: petugas,
          keterangan: ket
        };

        var savedRet = Database.insert('PENGEMBALIAN', returnRecord);
        savedReturns.push(savedRet);

        // Perbarui Unit Fisik di sheet INVENTARIS
        Database.updateById('INVENTARIS', invId, {
          status: newInvStatus,
          kondisi: (kondisi === 'KOTOR_RINGAN') ? 'BAIK' : ((kondisi === 'RUSAK_RINGAN') ? 'PERLU_PERBAIKAN' : kondisi),
          keterangan: 'Pengembalian ' + trxId + ': ' + ket
        });

        alreadyReturnedMap[invId] = true;
      }

      // 5. Cek Apakah Seluruh Barang dalam Transaksi Sudah Dikembalikan
      var totalItemCount = details.length;
      var returnedItemCount = Object.keys(alreadyReturnedMap).length;
      var isAllReturned = returnedItemCount >= totalItemCount;

      if (isAllReturned) {
        // Tandai transaksi sebagai SELESAI
        Database.updateById('TRANSAKSI', trxId, {
          status_transaksi: CONFIG.STATUS.TRANSAKSI.SELESAI
        });

        // Tandai sesi kunjungan sebagai SELESAI
        if (trx.visit_id) {
          Database.updateById('KUNJUNGAN', trx.visit_id, {
            status_kunjungan: CONFIG.STATUS.KUNJUNGAN.SELESAI
          });
        }
      }

      ActivityLog.record(
        petugas,
        'PROCESS_RETURN',
        'TRANSAKSI',
        trxId,
        'Menerima pengembalian ' + savedReturns.length + ' barang. (' + returnedItemCount + '/' + totalItemCount + ' unit dikembalikan' + (isAllReturned ? ' - TRANSAKSI SELESAI' : '') + ')'
      );

      return Response.success({
        returns: savedReturns,
        transaction_id: trxId,
        total_barang: totalItemCount,
        dikembalikan: returnedItemCount,
        sisa_barang: totalItemCount - returnedItemCount,
        is_completed: isAllReturned,
        status_transaksi: isAllReturned ? CONFIG.STATUS.TRANSAKSI.SELESAI : trx.status_transaksi
      }, 'Pengembalian barang sewa berhasil diproses');
    });
  }

  /**
   * Mengambil Daftar Transaksi Sewa yang Masih Aktif (DISEWA / Belum Selesai Dikembalikan)
   */
  function getActiveRentals(filters) {
    var f = filters || {};

    var activeTrx = Database.findAll('TRANSAKSI', function(trx) {
      if (trx.status_transaksi !== CONFIG.STATUS.TRANSAKSI.DISEWA) {
        return false;
      }
      return true;
    });

    var resultList = [];
    var allVisitors = Database.findAll('PENGUNJUNG');
    var visitorMap = {};
    allVisitors.forEach(function(v) { visitorMap[v.visitor_id] = v; });

    var allVisits = Database.findAll('KUNJUNGAN');
    var visitMap = {};
    allVisits.forEach(function(v) { visitMap[v.visit_id] = v; });

    activeTrx.forEach(function(trx) {
      var visit = visitMap[trx.visit_id] || {};
      var visitor = visitorMap[visit.visitor_id] || {};

      // Hitung barang yang sudah dan belum dikembalikan
      var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
        return d.transaction_id === trx.transaction_id;
      });

      var returns = Database.findAll('PENGEMBALIAN', function(r) {
        return r.transaction_id === trx.transaction_id;
      });

      var returnedMap = {};
      returns.forEach(function(r) { returnedMap[r.inventory_id] = true; });

      var pendingItems = details.filter(function(d) {
        return !returnedMap[d.inventory_id];
      });

      if (f.search) {
        var s = String(f.search).toLowerCase();
        var matchId = String(trx.transaction_id).toLowerCase().indexOf(s) !== -1;
        var matchName = String(visitor.nama_pengunjung || '').toLowerCase().indexOf(s) !== -1;
        if (!matchId && !matchName) return;
      }

      resultList.push(Object.assign({}, trx, {
        nama_pengunjung: visitor.nama_pengunjung || '-',
        nomor_telepon: visitor.nomor_telepon || '-',
        total_barang_disewa: details.length,
        total_barang_kembali: returns.length,
        sisa_barang_kembali: pendingItems.length,
        pending_items: pendingItems
      }));
    });

    return Response.success(resultList, 'Daftar penyewaan aktif yang belum dikembalikan');
  }

  /**
   * Mengambil Riwayat Seluruh Pengembalian Barang
   */
  function listReturns(filters, limit, offset) {
    var f = filters || {};
    var maxLimit = Number(limit) || 50;
    var skip = Number(offset) || 0;

    var returns = Database.findAll('PENGEMBALIAN', function(r) {
      if (f.transaction_id && r.transaction_id !== f.transaction_id) return false;
      if (f.kondisi && r.kondisi_pengembalian !== f.kondisi) return false;
      if (f.status && r.status_pengembalian !== f.status) return false;
      return true;
    });

    returns.sort(function(a, b) {
      return new Date(b.waktu_pengembalian) - new Date(a.waktu_pengembalian);
    });

    var total = returns.length;
    var paginated = returns.slice(skip, skip + maxLimit);

    return Response.success({
      items: paginated,
      total: total,
      limit: maxLimit,
      offset: skip
    }, 'Histori pengembalian barang sewa');
  }

  return {
    processReturn: processReturn,
    getActiveRentals: getActiveRentals,
    listReturns: listReturns
  };
})();
