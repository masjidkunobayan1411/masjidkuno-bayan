/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Inventaris Pakaian Adat
 * File: gas/Inventory.gs
 * ============================================================================
 * 
 * Modul ini melacak setiap unit fisik pakaian adat secara individual dengan
 * kode fisik/barcode, memantau kondisi fisik dan status ketersediaan,
 * serta mencegah double-booking pakaian adat melalui concurrency lock.
 */

var Inventory = (function() {
  var VALID_STATUSES = [
    CONFIG.STATUS.INVENTARIS.TERSEDIA,
    CONFIG.STATUS.INVENTARIS.DITAHAN,
    CONFIG.STATUS.INVENTARIS.DISEWA,
    CONFIG.STATUS.INVENTARIS.PERAWATAN,
    CONFIG.STATUS.INVENTARIS.RUSAK,
    CONFIG.STATUS.INVENTARIS.HILANG
  ];

  var VALID_CONDITIONS = ['BAIK', 'CUKUP', 'PERLU_PERBAIKAN'];

  /**
   * Validasi Input Data Unit Inventaris
   */
  function validateInventoryData_(data, isUpdate) {
    var errors = [];

    // Validasi product_id
    if (!isUpdate) {
      if (!data.product_id || String(data.product_id).trim().length === 0) {
        errors.push('product_id wajib disertakan.');
      }
    }

    // Validasi kode_barang (Barcode/Label Fisik)
    if (!data.kode_barang || String(data.kode_barang).trim().length === 0) {
      errors.push('Kode barang (label fisik/barcode) wajib diisi.');
    } else if (String(data.kode_barang).trim().length < 2) {
      errors.push('Kode barang minimal 2 karakter.');
    }

    // Validasi Kondisi
    if (data.kondisi) {
      var kond = String(data.kondisi).toUpperCase().trim();
      if (VALID_CONDITIONS.indexOf(kond) === -1) {
        errors.push('Kondisi barang tidak valid. Pilihan: ' + VALID_CONDITIONS.join(', '));
      }
    }

    // Validasi Status
    if (data.status) {
      var st = String(data.status).toUpperCase().trim();
      if (VALID_STATUSES.indexOf(st) === -1) {
        errors.push('Status inventaris tidak valid. Pilihan: ' + VALID_STATUSES.join(', '));
      }
    }

    return errors;
  }

  /**
   * Mendaftarkan Unit Fisik Pakaian Adat Baru
   */
  function createInventoryItem(payload, adminRole, adminId) {
    var errors = validateInventoryData_(payload, false);
    if (errors.length > 0) {
      return Response.error('Validasi unit inventaris gagal', errors);
    }

    return Database.withLock(function() {
      // 1. Verifikasi Keberadaan Produk
      var product = Database.findById('PRODUK', payload.product_id);
      if (!product) {
        return Response.error('Produk dengan ID [' + payload.product_id + '] tidak ditemukan.');
      }

      var kodeBarang = String(payload.kode_barang).trim().toUpperCase();

      // 2. Periksa Keunikan Kode Barang Fisik
      var existing = Database.findAll('INVENTARIS', function(item) {
        return String(item.kode_barang).trim().toUpperCase() === kodeBarang;
      });

      if (existing.length > 0) {
        return Response.error('Kode barang fisik [' + kodeBarang + '] sudah terdaftar pada inventaris lain.');
      }

      var inventoryRecord = {
        product_id: product.product_id,
        kode_barang: kodeBarang,
        kondisi: String(payload.kondisi || 'BAIK').toUpperCase().trim(),
        status: String(payload.status || CONFIG.STATUS.INVENTARIS.TERSEDIA).toUpperCase().trim(),
        tanggal_masuk: payload.tanggal_masuk ? String(payload.tanggal_masuk).trim() : Utils.getTodayWitaString(),
        keterangan: payload.keterangan ? String(payload.keterangan).trim() : '-'
      };

      var saved = Database.insert('INVENTARIS', inventoryRecord);

      ActivityLog.record(
        adminId || 'ADMIN',
        'CREATE_INVENTORY',
        'INVENTARIS',
        saved.inventory_id,
        'Mendaftarkan unit fisik baru: ' + saved.kode_barang + ' (' + product.nama_produk + ')'
      );

      return Response.success(saved, 'Unit inventaris berhasil didaftarkan');
    });
  }

  /**
   * Pendaftaran Unit Fisik Massal (Batch Creation)
   * Contoh: Mendaftarkan 10 unit Kain Poleng (POL-001 hingga POL-010) sekaligus
   */
  function batchCreateInventory(payload, adminRole, adminId) {
    if (!payload.product_id || !payload.prefix_kode || !payload.jumlah) {
      return Response.error('Parameter batch tidak lengkap: product_id, prefix_kode, dan jumlah wajib diisi.');
    }

    var count = Number(payload.jumlah);
    if (isNaN(count) || count < 1 || count > 100) {
      return Response.error('Jumlah unit batch harus antara 1 hingga 100 per proses.');
    }

    return Database.withLock(function() {
      var product = Database.findById('PRODUK', payload.product_id);
      if (!product) {
        return Response.error('Produk dengan ID [' + payload.product_id + '] tidak ditemukan.');
      }

      var startNum = Number(payload.mulai_nomor || 1);
      var prefix = String(payload.prefix_kode).trim().toUpperCase();
      var createdItems = [];
      var tglMasuk = payload.tanggal_masuk ? String(payload.tanggal_masuk).trim() : Utils.getTodayWitaString();

      // Ambil seluruh kode barang yang sudah ada untuk cek duplikasi
      var existingCodes = {};
      Database.findAll('INVENTARIS').forEach(function(item) {
        existingCodes[String(item.kode_barang).toUpperCase().trim()] = true;
      });

      for (var i = 0; i < count; i++) {
        var num = startNum + i;
        var padded = ('000' + num).slice(-3);
        var kodeBarang = prefix + '-' + padded;

        if (existingCodes[kodeBarang]) {
          continue; // Lewati jika sudah ada
        }

        var itemRecord = {
          product_id: product.product_id,
          kode_barang: kodeBarang,
          kondisi: 'BAIK',
          status: CONFIG.STATUS.INVENTARIS.TERSEDIA,
          tanggal_masuk: tglMasuk,
          keterangan: payload.keterangan ? String(payload.keterangan).trim() : 'Pendaftaran batch'
        };

        var saved = Database.insert('INVENTARIS', itemRecord);
        createdItems.push(saved);
        existingCodes[kodeBarang] = true;
      }

      ActivityLog.record(
        adminId || 'ADMIN',
        'BATCH_CREATE_INVENTORY',
        'INVENTARIS',
        product.product_id,
        'Mendaftarkan ' + createdItems.length + ' unit fisik pakaian secara massal'
      );

      return Response.success({
        created_count: createdItems.length,
        items: createdItems
      }, 'Berhasil mendaftarkan ' + createdItems.length + ' unit inventaris');
    });
  }

  /**
   * Memperbarui Kondisi, Status, dan Keterangan Unit Fisik
   */
  function updateInventoryItem(payload, adminId) {
    var inventoryId = payload.inventory_id;
    if (!inventoryId) {
      return Response.error('inventory_id wajib disertakan.');
    }

    return Database.withLock(function() {
      var existing = Database.findById('INVENTARIS', inventoryId);
      if (!existing) {
        return Response.error('Unit inventaris dengan ID [' + inventoryId + '] tidak ditemukan.');
      }

      var updateFields = {};
      if (payload.kondisi) {
        var kond = String(payload.kondisi).toUpperCase().trim();
        if (VALID_CONDITIONS.indexOf(kond) === -1) {
          return Response.error('Kondisi tidak valid: ' + kond);
        }
        updateFields.kondisi = kond;
      }

      if (payload.status) {
        var st = String(payload.status).toUpperCase().trim();
        if (VALID_STATUSES.indexOf(st) === -1) {
          return Response.error('Status tidak valid: ' + st);
        }
        updateFields.status = st;
      }

      if (payload.keterangan !== undefined) {
        updateFields.keterangan = String(payload.keterangan).trim();
      }

      var updated = Database.updateById('INVENTARIS', inventoryId, updateFields);

      ActivityLog.record(
        adminId || 'ADMIN',
        'UPDATE_INVENTORY',
        'INVENTARIS',
        inventoryId,
        'Pembaruan unit: ' + updated.kode_barang + ' (Status: ' + updated.status + ', Kondisi: ' + updated.kondisi + ')'
      );

      return Response.success(updated, 'Unit inventaris berhasil diperbarui');
    });
  }

  /**
   * Mengambil Detail Unit Inventaris Berdasarkan inventory_id
   */
  function getInventoryById(inventoryId) {
    if (!inventoryId) {
      return Response.error('inventory_id wajib disertakan.');
    }

    var item = Database.findById('INVENTARIS', inventoryId);
    if (!item) {
      return Response.error('Unit inventaris dengan ID [' + inventoryId + '] tidak ditemukan.');
    }

    var product = Database.findById('PRODUK', item.product_id) || {};

    return Response.success(Object.assign({}, item, {
      nama_produk: product.nama_produk || '-',
      kode_produk: product.kode_produk || '-',
      harga_sewa: product.harga_sewa || 0,
      satuan: product.satuan || '-'
    }), 'Detail unit inventaris');
  }

  /**
   * Mengambil Detail Unit Berdasarkan Kode Fisik / Barcode Scanner
   */
  function getInventoryByCode(kodeBarang) {
    if (!kodeBarang) {
      return Response.error('kode_barang wajib disertakan.');
    }

    var targetCode = String(kodeBarang).toUpperCase().trim();
    var items = Database.findAll('INVENTARIS', function(inv) {
      return String(inv.kode_barang).toUpperCase().trim() === targetCode;
    });

    if (items.length === 0) {
      return Response.error('Unit inventaris dengan kode [' + targetCode + '] tidak ditemukan.');
    }

    var item = items[0];
    var product = Database.findById('PRODUK', item.product_id) || {};

    return Response.success(Object.assign({}, item, {
      nama_produk: product.nama_produk || '-',
      kode_produk: product.kode_produk || '-',
      harga_sewa: product.harga_sewa || 0,
      satuan: product.satuan || '-'
    }), 'Detail unit inventaris');
  }

  /**
   * Mengambil Daftar Inventaris dengan Filter & Pagination
   */
  function listInventory(filters, limit, offset) {
    var f = filters || {};
    var maxLimit = Number(limit) || 50;
    var skip = Number(offset) || 0;

    var allProducts = Database.findAll('PRODUK');
    var productMap = {};
    allProducts.forEach(function(p) {
      productMap[p.product_id] = p;
    });

    var items = Database.findAll('INVENTARIS', function(item) {
      if (f.product_id && item.product_id !== f.product_id) return false;
      if (f.status && f.status !== 'ALL' && item.status !== f.status) return false;
      if (f.kondisi && f.kondisi !== 'ALL' && item.kondisi !== f.kondisi) return false;
      if (f.search) {
        var s = String(f.search).toLowerCase();
        var codeMatch = String(item.kode_barang).toLowerCase().indexOf(s) !== -1;
        var idMatch = String(item.inventory_id).toLowerCase().indexOf(s) !== -1;
        var ketMatch = String(item.keterangan || '').toLowerCase().indexOf(s) !== -1;
        var pInfo = productMap[item.product_id] || {};
        var nameMatch = String(pInfo.nama_produk || '').toLowerCase().indexOf(s) !== -1;
        if (!codeMatch && !idMatch && !ketMatch && !nameMatch) return false;
      }
      return true;
    });

    // Gabungkan dengan info produk
    var enriched = items.map(function(item) {
      var p = productMap[item.product_id] || {};
      return Object.assign({}, item, {
        nama_produk: p.nama_produk || '-',
        kode_produk: p.kode_produk || '-',
        harga_sewa: p.harga_sewa || 0,
        satuan: p.satuan || '-'
      });
    });

    var total = enriched.length;
    var paginated = enriched.slice(skip, skip + maxLimit);

    return Response.success({
      items: paginated,
      total: total,
      limit: maxLimit,
      offset: skip
    }, 'Daftar unit inventaris');
  }

  /**
   * Mengambil Seluruh Unit yang TERSEDIA untuk Suatu Produk
   * Digunakan oleh antarmuka formulir transaksi penyewaan
   */
  function getAvailableItems(productId) {
    if (!productId) {
      return Response.error('product_id wajib disertakan.');
    }

    var available = Database.findAll('INVENTARIS', function(item) {
      return item.product_id === productId &&
             item.status === CONFIG.STATUS.INVENTARIS.TERSEDIA &&
             item.kondisi !== 'RUSAK_BERAT';
    });

    return Response.success(available, 'Daftar unit inventaris tersedia');
  }

  /**
   * Kunci Status Unit Menjadi DISEWA (Atomic Double-Booking Prevention)
   * Wajib dipanggil dalam blok transaksi sewa
   */
  function lockItemsForRental(inventoryIds) {
    if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return { success: false, message: 'Daftar inventory_id tidak boleh kosong.' };
    }

    return Database.withLock(function() {
      // 1. Verifikasi bahwa SEMUA unit yang dipilih berstatus TERSEDIA
      for (var i = 0; i < inventoryIds.length; i++) {
        var id = inventoryIds[i];
        var item = Database.findById('INVENTARIS', id);
        if (!item) {
          return { success: false, message: 'Unit inventaris ID [' + id + '] tidak ditemukan.' };
        }
        if (item.status !== CONFIG.STATUS.INVENTARIS.TERSEDIA) {
          return {
            success: false,
            message: 'Unit [' + item.kode_barang + '] saat ini berstatus ' + item.status + ' dan tidak dapat disewa (mencegah double-booking).'
          };
        }
      }

      // 2. Ubah status menjadi DISEWA
      for (var j = 0; j < inventoryIds.length; j++) {
        Database.updateById('INVENTARIS', inventoryIds[j], {
          status: CONFIG.STATUS.INVENTARIS.DISEWA
        });
      }

      return { success: true };
    });
  }

  return {
    validateInventoryData_: validateInventoryData_,
    createInventoryItem: createInventoryItem,
    batchCreateInventory: batchCreateInventory,
    updateInventoryItem: updateInventoryItem,
    getInventoryById: getInventoryById,
    getInventoryByCode: getInventoryByCode,
    listInventory: listInventory,
    getAvailableItems: getAvailableItems,
    lockItemsForRental: lockItemsForRental
  };
})();
