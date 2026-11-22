/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Transaksi Penyewaan Pakaian Adat
 * File: gas/Transaction.gs
 * ============================================================================
 * 
 * Modul ini menangani pembuatan transaksi sewa, snapshot harga dan produk
 * (mencegah manipulasi harga browser), verifikasi ketersediaan unit fisik
 * dengan penguncian eksklusif (anti double-booking), dan pelacakan rincian sewa.
 */

var Transaction = (function() {
  /**
   * Membuat Transaksi Penyewaan Baru Berdasarkan Kunjungan
   * 
   * Payload:
   * {
   *   "visit_id": "VST-...",
   *   "petugas_id": "ADM-...",
   *   "items": [
   *     { "inventory_id": "INV-..." },
   *     ...
   *   ]
   * }
   */
  function createTransaction(payload, adminId) {
    if (!payload.visit_id) {
      return Response.error('visit_id wajib disertakan.');
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return Response.error('Daftar barang sewaan (items) tidak boleh kosong.');
    }

    var petugasId = adminId || payload.petugas_id || 'ADMIN';

    return Database.withLock(function() {
      // 1. Verifikasi Keberadaan Kunjungan
      var visit = Database.findById('KUNJUNGAN', payload.visit_id);
      if (!visit) {
        return Response.error('Data kunjungan [' + payload.visit_id + '] tidak ditemukan.');
      }

      // 2. Kumpulkan inventory_id dan periksa duplikasi di dalam request
      var inventoryIds = [];
      var seenIds = {};
      for (var i = 0; i < payload.items.length; i++) {
        var invId = payload.items[i].inventory_id;
        if (!invId) {
          return Response.error('Setiap baris barang wajib menyertakan inventory_id.');
        }
        if (seenIds[invId]) {
          return Response.error('Unit inventaris [' + invId + '] duplikat di dalam transaksi yang sama.');
        }
        seenIds[invId] = true;
        inventoryIds.push(invId);
      }

      // 3. Verifikasi Seluruh Unit Inventaris Harus Berstatus TERSEDIA
      var inventoryItems = [];
      var productCache = {};
      var detailRows = [];
      var totalHarga = 0;

      for (var j = 0; j < inventoryIds.length; j++) {
        var id = inventoryIds[j];
        var item = Database.findById('INVENTARIS', id);
        if (!item) {
          return Response.error('Unit fisik pakaian ID [' + id + '] tidak ditemukan pada sistem.');
        }
        if (item.status !== CONFIG.STATUS.INVENTARIS.TERSEDIA) {
          return Response.error('Unit [' + item.kode_barang + '] saat ini berstatus ' + item.status + ' dan tidak dapat disewa (mencegah double-booking).');
        }

        // Ambil data produk resmi dari database (Anti-manipulasi harga browser)
        var product = productCache[item.product_id];
        if (!product) {
          product = Database.findById('PRODUK', item.product_id);
          if (!product) {
            return Response.error('Data produk untuk unit [' + item.kode_barang + '] tidak ditemukan.');
          }
          if (product.status !== CONFIG.STATUS.PRODUK.AKTIF) {
            return Response.error('Produk [' + product.nama_produk + '] sedang NONAKTIF dan tidak dapat disewa.');
          }
          productCache[item.product_id] = product;
        }

        var hargaSnapshot = Number(product.harga_sewa);
        var subtotal = hargaSnapshot * 1;
        totalHarga += subtotal;

        inventoryItems.push(item);
        detailRows.push({
          inventory_id: item.inventory_id,
          product_id: product.product_id,
          nama_produk_snapshot: product.nama_produk,
          harga_snapshot: hargaSnapshot,
          jumlah: 1,
          subtotal: subtotal
        });
      }

      // 4. Buat Master Transaksi
      var totalBarang = inventoryItems.length;
      var todayWita = Utils.getTodayWitaString();

      var trxRecord = {
        visit_id: visit.visit_id,
        tanggal_transaksi: todayWita,
        total_barang: totalBarang,
        total_harga: totalHarga,
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DRAFT,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.BELUM_DIBAYAR,
        petugas_id: petugasId
      };

      var savedTrx = Database.insert('TRANSAKSI', trxRecord);

      // 5. Simpan Seluruh DETAIL_TRANSAKSI dengan Snapshot Permanen
      var savedDetails = [];
      for (var k = 0; k < detailRows.length; k++) {
        var dRow = detailRows[k];
        dRow.transaction_id = savedTrx.transaction_id;
        var savedDtr = Database.insert('DETAIL_TRANSAKSI', dRow);
        savedDetails.push(savedDtr);
      }

      // 6. Kunci Status Unit Fisik Menjadi DITAHAN Sementara Menunggu Pembayaran
      for (var l = 0; l < inventoryItems.length; l++) {
        Database.updateById('INVENTARIS', inventoryItems[l].inventory_id, {
          status: CONFIG.STATUS.INVENTARIS.DITAHAN
        });
      }

      // 7. Catat Audit Log
      ActivityLog.record(
        petugasId,
        'CREATE_TRANSACTION',
        'TRANSAKSI',
        savedTrx.transaction_id,
        'Membuat draft transaksi sewa: ' + totalBarang + ' unit pakaian (Total Rp' + totalHarga.toLocaleString('id-ID') + ')'
      );

      return Response.success({
        transaction: savedTrx,
        details: savedDetails,
        visit: visit
      }, 'Transaksi sewa pakaian adat berhasil dibuat');
    });
  }

  /**
   * Mengambil Detail Transaksi Lengkap (Termasuk Rincian Barang dan Pembayaran)
   */
  function getTransactionById(transactionId) {
    if (!transactionId) {
      return Response.error('transaction_id wajib disertakan.');
    }

    var trx = Database.findById('TRANSAKSI', transactionId);
    if (!trx) {
      return Response.error('Transaksi dengan ID [' + transactionId + '] tidak ditemukan.');
    }

    // Ambil data admin/petugas kasir resmi
    var admin = trx.petugas_id ? Database.findById('ADMIN', trx.petugas_id) : null;
    trx.nama_petugas = admin ? admin.nama : (trx.petugas_id || 'Petugas Kasir');

    // Ambil detail transaksi
    var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
      return d.transaction_id === transactionId;
    });

    // Ambil histori pembayaran
    var payments = Database.findAll('PEMBAYARAN', function(p) {
      return p.transaction_id === transactionId;
    });

    // Ambil data kunjungan dan pengunjung
    var visit = Database.findById('KUNJUNGAN', trx.visit_id) || {};
    var visitor = visit.visitor_id ? Database.findById('PENGUNJUNG', visit.visitor_id) : {};

    // Ambil histori pengembalian
    var returns = Database.findAll('PENGEMBALIAN', function(r) {
      return r.transaction_id === transactionId;
    });

    return Response.success({
      transaction: trx,
      details: details,
      payments: payments,
      returns: returns,
      visit: visit,
      visitor: visitor,
      petugas: admin ? { admin_id: admin.admin_id, nama: admin.nama } : null
    }, 'Detail transaksi sewa');
  }

  /**
   * Mengambil Daftar Transaksi dengan Filter & Pagination
   */
  function listTransactions(filters, limit, offset) {
    var f = filters || {};
    var maxLimit = Number(limit) || 50;
    var skip = Number(offset) || 0;

    var transactions = Database.findAll('TRANSAKSI', function(trx) {
      if (f.status_transaksi && f.status_transaksi !== 'ALL' && trx.status_transaksi !== f.status_transaksi) {
        return false;
      }
      if (f.status_pembayaran && f.status_pembayaran !== 'ALL' && trx.status_pembayaran !== f.status_pembayaran) {
        return false;
      }
      var trxDate = Utils.extractDateString(trx.tanggal_transaksi);
      if (f.start_date && trxDate && trxDate < f.start_date) {
        return false;
      }
      if (f.end_date && trxDate && trxDate > f.end_date) {
        return false;
      }
      if (f.search) {
        var s = String(f.search).toLowerCase();
        var matchId = String(trx.transaction_id).toLowerCase().indexOf(s) !== -1;
        var matchVisit = String(trx.visit_id).toLowerCase().indexOf(s) !== -1;
        if (!matchId && !matchVisit) return false;
      }
      return true;
    });

    // Urutkan dari yang paling baru
    transactions.sort(function(a, b) {
      return new Date(b.dibuat_pada) - new Date(a.dibuat_pada);
    });

    var total = transactions.length;
    var paginated = transactions.slice(skip, skip + maxLimit);

    // Ambil pembayaran untuk mencatat metode pembayaran (TUNAI vs QRIS)
    var allPayments = Database.findAll('PEMBAYARAN');
    var paymentMap = {};
    allPayments.forEach(function(p) {
      if (p.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.BERHASIL) {
        paymentMap[p.transaction_id] = p;
      }
    });

    // Ambil kunjungan dan profil pengunjung
    var allVisits = Database.findAll('KUNJUNGAN');
    var allVisitors = Database.findAll('PENGUNJUNG');
    var visitorMap = {};
    allVisitors.forEach(function(v) { visitorMap[v.visitor_id] = v; });
    var visitMap = {};
    allVisits.forEach(function(vis) {
      var prof = visitorMap[vis.visitor_id] || {};
      visitMap[vis.visit_id] = {
        nama_pengunjung: prof.nama_pengunjung || '-',
        jenis_pengunjung: prof.jenis_pengunjung || 'DOMESTIK'
      };
    });

    // Ambil rincian barang untuk menghitung sewa Kain Poleng & Kain Batik per transaksi
    var allDetails = Database.findAll('DETAIL_TRANSAKSI');
    var detailsMap = {};
    allDetails.forEach(function(d) {
      if (!detailsMap[d.transaction_id]) {
        detailsMap[d.transaction_id] = { poleng: 0, batik: 0 };
      }
      var pName = String(d.nama_produk_snapshot || '').toLowerCase();
      var qty = Number(d.jumlah || 1);
      if (pName.indexOf('poleng') !== -1) {
        detailsMap[d.transaction_id].poleng += qty;
      } else if (pName.indexOf('batik') !== -1) {
        detailsMap[d.transaction_id].batik += qty;
      }
    });

    // Buat map admin untuk lookup nama petugas
    var allAdmins = Database.findAll('ADMIN');
    var adminMap = {};
    allAdmins.forEach(function(a) { adminMap[a.admin_id] = a.nama; });

    var enriched = paginated.map(function(trx) {
      var pay = paymentMap[trx.transaction_id];
      var visInfo = visitMap[trx.visit_id] || {};
      var dCount = detailsMap[trx.transaction_id] || { poleng: 0, batik: 0 };

      // Normalisasi nama metode pembayaran (TUNAI, QRIS BAYANNESIA, QRIS BUMDES BAYAN, dll)
      var metode = trx.metode_pembayaran || (pay ? pay.metode_pembayaran : (trx.status_pembayaran === 'LUNAS' ? 'TUNAI' : '-'));

      return {
        transaction_id: trx.transaction_id,
        visit_id: trx.visit_id,
        tanggal_transaksi: trx.tanggal_transaksi,
        total_barang: trx.total_barang,
        total_harga: trx.total_harga,
        status_transaksi: trx.status_transaksi,
        status_pembayaran: trx.status_pembayaran,
        petugas_id: trx.petugas_id,
        nama_petugas: adminMap[trx.petugas_id] || trx.petugas_id || 'Petugas Kasir',
        dibuat_pada: trx.dibuat_pada,
        metode_pembayaran: metode,
        jumlah_kain_poleng: dCount.poleng,
        jumlah_kain_batik: dCount.batik,
        nama_pengunjung: visInfo.nama_pengunjung || '-',
        jenis_pengunjung: visInfo.jenis_pengunjung || 'DOMESTIK'
      };
    });

    return Response.success({
      items: enriched,
      total: total,
      limit: maxLimit,
      offset: skip
    }, 'Daftar transaksi penyewaan');
  }

  /**
   * Membatalkan Transaksi (Hanya jika belum lunas / masih DRAFT)
   * Mengembalikan seluruh unit inventaris dari DITAHAN menjadi TERSEDIA
   */
  function cancelTransaction(transactionId, alasan, adminId) {
    if (!transactionId) {
      return Response.error('transaction_id wajib disertakan.');
    }

    return Database.withLock(function() {
      var trx = Database.findById('TRANSAKSI', transactionId);
      if (!trx) {
        return Response.error('Transaksi [' + transactionId + '] tidak ditemukan.');
      }

      if (trx.status_transaksi === CONFIG.STATUS.TRANSAKSI.SELESAI) {
        return Response.error('Transaksi yang sudah SELESAI tidak dapat dibatalkan.');
      }
      if (trx.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.LUNAS) {
        return Response.error('Transaksi yang sudah LUNAS tidak dapat dibatalkan secara langsung.');
      }

      // Ambil seluruh detail barang
      var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
        return d.transaction_id === transactionId;
      });

      // Kembalikan status unit inventaris menjadi TERSEDIA
      for (var i = 0; i < details.length; i++) {
        var invId = details[i].inventory_id;
        var invItem = Database.findById('INVENTARIS', invId);
        if (invItem && invItem.status === CONFIG.STATUS.INVENTARIS.DITAHAN) {
          Database.updateById('INVENTARIS', invId, {
            status: CONFIG.STATUS.INVENTARIS.TERSEDIA
          });
        }
      }

      // Update transaksi menjadi DIBATALKAN
      var updated = Database.updateById('TRANSAKSI', transactionId, {
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DIBATALKAN
      });

      ActivityLog.record(
        adminId || 'ADMIN',
        'CANCEL_TRANSACTION',
        'TRANSAKSI',
        transactionId,
        'Transaksi sewa dibatalkan: ' + (alasan || 'Dibatalkan oleh pengelola')
      );

      return Response.success(updated, 'Transaksi berhasil dibatalkan dan unit inventaris dilepaskan');
    });
  }

  return {
    createTransaction: createTransaction,
    getTransactionById: getTransactionById,
    listTransactions: listTransactions,
    cancelTransaction: cancelTransaction
  };
})();
