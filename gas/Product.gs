/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Produk Pakaian Adat
 * File: gas/Product.gs
 * ============================================================================
 * 
 * Modul ini menangani katalog pakaian adat, penyesuaian tarif sewa fleksibel
 * oleh Super Admin, aktivasi/deaktivasi produk, serta kalkulasi ringkasan stok.
 */

var Product = (function() {
  /**
   * Validasi Input Data Produk
   */
  function validateProductData_(data, isUpdate) {
    var errors = [];

    // Validasi Nama Produk
    if (!data.nama_produk || typeof data.nama_produk !== 'string' || data.nama_produk.trim().length === 0) {
      errors.push('Nama produk wajib diisi.');
    } else if (data.nama_produk.trim().length < 3) {
      errors.push('Nama produk minimal 3 karakter.');
    }

    // Validasi Kode Produk (Hanya jika produk baru atau kode diubah)
    if (!isUpdate || data.kode_produk) {
      var kode = String(data.kode_produk || '').trim().toUpperCase();
      if (kode.length < 2 || kode.length > 10) {
        errors.push('Kode produk harus berukuran 2 hingga 10 karakter alfanumerik (contoh: POL, BAT).');
      } else if (!/^[A-Z0-9_-]+$/.test(kode)) {
        errors.push('Kode produk hanya boleh memuat huruf kapital, angka, garis bawah, atau strip.');
      }
    }

    // Validasi Harga Sewa
    var harga = Number(data.harga_sewa);
    if (isNaN(harga) || harga < 0) {
      errors.push('Harga sewa harus berupa angka positif atau nol.');
    }

    // Validasi Status jika disertakan
    if (data.status) {
      var st = String(data.status).toUpperCase().trim();
      if (st !== CONFIG.STATUS.PRODUK.AKTIF && st !== CONFIG.STATUS.PRODUK.NONAKTIF) {
        errors.push('Status produk harus AKTIF atau NONAKTIF.');
      }
    }

    return errors;
  }

  /**
   * Membuat Produk Pakaian Adat Baru (Hanya Super Admin)
   */
  function createProduct(payload, adminRole, adminId) {
    // 1. Otorisasi Role Super Admin
    var authCheck = Security.authorizeRole(adminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    // 2. Validasi Input Data
    var errors = validateProductData_(payload, false);
    if (errors.length > 0) {
      return Response.error('Validasi produk gagal', errors);
    }

    return Database.withLock(function() {
      var kode = String(payload.kode_produk).trim().toUpperCase();

      // 3. Periksa Keunikan Kode Produk
      var existing = Database.findAll('PRODUK', function(item) {
        return String(item.kode_produk).trim().toUpperCase() === kode;
      });

      if (existing.length > 0) {
        return Response.error('Kode produk [' + kode + '] sudah digunakan oleh produk lain.');
      }

      var productId = 'PRD-' + kode;

      var newProduct = {
        product_id: productId,
        kode_produk: kode,
        nama_produk: String(payload.nama_produk).trim(),
        kategori: String(payload.kategori || 'PAKAIAN_ADAT').trim().toUpperCase(),
        harga_sewa: Number(payload.harga_sewa),
        satuan: String(payload.satuan || 'unit/kunjungan').trim(),
        deskripsi: String(payload.deskripsi || '-').trim(),
        status: String(payload.status || CONFIG.STATUS.PRODUK.AKTIF).trim().toUpperCase()
      };

      var saved = Database.insert('PRODUK', newProduct);

      ActivityLog.record(
        adminId || 'SUPER_ADMIN',
        'CREATE_PRODUCT',
        'PRODUK',
        saved.product_id,
        'Menambahkan produk baru: ' + saved.nama_produk + ' (Rp' + saved.harga_sewa.toLocaleString('id-ID') + ')'
      );

      return Response.success(saved, 'Produk berhasil ditambahkan');
    });
  }

  /**
   * Memperbarui Data / Tarif Sewa Produk (Hanya Super Admin)
   * Catatan: Perubahan harga di sini tidak akan mengubah transaksi historis lama (Business Rule E.3).
   */
  function updateProduct(payload, adminRole, adminId) {
    var authCheck = Security.authorizeRole(adminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    var productId = payload.product_id;
    if (!productId) {
      return Response.error('product_id wajib disertakan.');
    }

    var errors = validateProductData_(payload, true);
    if (errors.length > 0) {
      return Response.error('Validasi produk gagal', errors);
    }

    return Database.withLock(function() {
      var existing = Database.findById('PRODUK', productId);
      if (!existing) {
        return Response.error('Produk dengan ID [' + productId + '] tidak ditemukan.');
      }

      var updateFields = {
        nama_produk: String(payload.nama_produk).trim(),
        kategori: String(payload.kategori || existing.kategori).trim().toUpperCase(),
        harga_sewa: Number(payload.harga_sewa),
        satuan: String(payload.satuan || existing.satuan).trim(),
        deskripsi: String(payload.deskripsi || existing.deskripsi).trim(),
        status: String(payload.status || existing.status).trim().toUpperCase()
      };

      var updated = Database.updateById('PRODUK', productId, updateFields);

      ActivityLog.record(
        adminId || 'SUPER_ADMIN',
        'UPDATE_PRODUCT',
        'PRODUK',
        productId,
        'Pembaruan produk: ' + updated.nama_produk + ' (Tarif baru: Rp' + updated.harga_sewa.toLocaleString('id-ID') + ')'
      );

      return Response.success(updated, 'Produk berhasil diperbarui');
    });
  }

  /**
   * Mengubah Status Aktif / Nonaktif Produk
   */
  function toggleProductStatus(productId, newStatus, adminRole, adminId) {
    var authCheck = Security.authorizeRole(adminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    if (!productId || !newStatus) {
      return Response.error('product_id dan newStatus wajib disertakan.');
    }

    var st = String(newStatus).toUpperCase().trim();
    if (st !== CONFIG.STATUS.PRODUK.AKTIF && st !== CONFIG.STATUS.PRODUK.NONAKTIF) {
      return Response.error('Status produk tidak valid. Gunakan AKTIF atau NONAKTIF.');
    }

    var updated = Database.updateById('PRODUK', productId, { status: st });

    ActivityLog.record(
      adminId || 'SUPER_ADMIN',
      'TOGGLE_PRODUCT_STATUS',
      'PRODUK',
      productId,
      'Status produk diubah menjadi ' + st
    );

    return Response.success(updated, 'Status produk berhasil diperbarui menjadi ' + st);
  }

  /**
   * Mengambil Detail Produk Berdasarkan product_id
   */
  function getProductById(productId) {
    if (!productId) {
      return Response.error('product_id wajib disertakan.');
    }

    var product = Database.findById('PRODUK', productId);
    if (!product) {
      return Response.error('Produk dengan ID [' + productId + '] tidak ditemukan.');
    }

    return Response.success(product, 'Detail produk');
  }

  /**
   * Mengambil Daftar Produk beserta Ringkasan Stok Ketersediaan Inventaris
   */
  function listProducts(filters) {
    var f = filters || {};
    var statusFilter = f.status ? String(f.status).toUpperCase().trim() : null;
    var kategoriFilter = f.kategori ? String(f.kategori).toUpperCase().trim() : null;

    var products = Database.findAll('PRODUK', function(item) {
      if (statusFilter && statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (kategoriFilter && item.kategori !== kategoriFilter) {
        return false;
      }
      return true;
    });

    // Ambil data stok inventaris untuk menghitung ketersediaan unit sewa secara riil
    var allInventory = Database.findAll('INVENTARIS');
    var inventoryStats = {};

    allInventory.forEach(function(inv) {
      var pid = inv.product_id;
      if (!inventoryStats[pid]) {
        inventoryStats[pid] = {
          total_unit: 0,
          tersedia: 0,
          disewa: 0,
          ditahan: 0,
          perawatan: 0,
          rusak: 0,
          hilang: 0
        };
      }

      inventoryStats[pid].total_unit++;
      var st = String(inv.status).toUpperCase().trim();
      if (st === CONFIG.STATUS.INVENTARIS.TERSEDIA) inventoryStats[pid].tersedia++;
      else if (st === CONFIG.STATUS.INVENTARIS.DISEWA) inventoryStats[pid].disewa++;
      else if (st === CONFIG.STATUS.INVENTARIS.DITAHAN) inventoryStats[pid].ditahan++;
      else if (st === CONFIG.STATUS.INVENTARIS.PERAWATAN) inventoryStats[pid].perawatan++;
      else if (st === CONFIG.STATUS.INVENTARIS.RUSAK) inventoryStats[pid].rusak++;
      else if (st === CONFIG.STATUS.INVENTARIS.HILANG) inventoryStats[pid].hilang++;
    });

    var enrichedProducts = products.map(function(p) {
      var stats = inventoryStats[p.product_id] || {
        total_unit: 0,
        tersedia: 0,
        disewa: 0,
        ditahan: 0,
        perawatan: 0,
        rusak: 0,
        hilang: 0
      };
      return Object.assign({}, p, { stok: stats });
    });

    return Response.success(enrichedProducts, 'Daftar katalog produk');
  }

  return {
    validateProductData_: validateProductData_,
    createProduct: createProduct,
    updateProduct: updateProduct,
    toggleProductStatus: toggleProductStatus,
    getProductById: getProductById,
    listProducts: listProducts
  };
})();
