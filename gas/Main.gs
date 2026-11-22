/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Router Utama & Web App Dispatcher
 * File: gas/Main.gs
 * ============================================================================
 * 
 * Titik masuk utama (entrypoint) Google Apps Script Web App.
 * Menangani HTTP GET untuk uji koneksi dan HTTP POST sebagai API Gateway
 * dengan verifikasi tanda tangan HMAC server-to-server.
 */

/**
 * Handler HTTP GET: Digunakan untuk health-check dan ping koneksi
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';

    if (action === 'ping') {
      return Response.toOutput(Response.success({
        app: CONFIG.APP_NAME,
        version: CONFIG.VERSION,
        location: CONFIG.LOCATION,
        timezone: CONFIG.TIMEZONE,
        status: 'ONLINE',
        serverTime: Utils.getNowWitaIsoString()
      }, 'Layanan Backend BAYAN VISITOR aktif'));
    }

    if (action === 'validate') {
      var validationResult = validateBayanDatabase();
      return Response.toOutput(Response.success(validationResult, 'Hasil validasi database'));
    }

    return Response.toOutput(Response.error('Aksi GET tidak dikenali. Gunakan HTTP POST untuk komunikasi API.', null, {
      supportedGetActions: ['ping', 'validate']
    }));
  } catch (err) {
    return Response.toOutput(Response.error('Terjadi kesalahan pada doGet: ' + err.message));
  }
}

/**
 * Handler HTTP POST: API Gateway Utama untuk seluruh operasi sistem
 */
function doPost(e) {
  try {
    // 1. Validasi Kehadiran Payload
    if (!e || !e.postData || !e.postData.contents) {
      return Response.toOutput(Response.error('Permintaan ditolak: Tidak ada body data yang dikirimkan.'));
    }

    var requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return Response.toOutput(Response.error('Format JSON tidak valid: ' + parseErr.message));
    }

    var action = requestData.action;
    if (!action) {
      return Response.toOutput(Response.error('Parameter [action] wajib disertakan dalam request.'));
    }

    // 2. Aksi Publik Khusus Tanpa Tanda Tangan HMAC (Hanya untuk ping sistem)
    var isPublicAction = (action === 'system:ping');

    // 3. Verifikasi Tanda Tangan HMAC Server-to-Server untuk Seluruh Aksi Lainnya
    if (!isPublicAction) {
      var authResult = Security.verifyServerSignature(requestData);
      if (!authResult.valid) {
        return Response.toOutput(Response.error(authResult.message));
      }
    }

    var payload = requestData.payload || {};

    // 4. Router Aksi (Action Dispatcher)
    var resultData;
    switch (action) {
      // --- SISTEM ---
      case 'system:ping':
        resultData = Response.success({
          status: 'OK',
          time: Utils.getNowWitaIsoString()
        }, 'Server responsif');
        break;

      case 'system:info':
        var settings = Database.findAll('PENGATURAN');
        resultData = Response.success({
          app: CONFIG.APP_NAME,
          version: CONFIG.VERSION,
          timezone: CONFIG.TIMEZONE,
          settings: settings
        }, 'Informasi konfigurasi sistem');
        break;

      case 'system:update_settings':
        resultData = updateSettings_(payload);
        break;

      // --- MODUL PENGUNJUNG (VISITOR) ---
      case 'visitor:create':
        resultData = Visitor.createVisitor(payload);
        break;

      case 'visitor:get':
        resultData = Visitor.getVisitorById(payload.visitor_id);
        break;

      case 'visitor:list':
        resultData = Visitor.findVisitors(payload.query, payload.limit);
        break;

      // --- MODUL KUNJUNGAN (VISIT) ---
      case 'visit:register':
        // Registrasi publik terpadu (Atomic: Pengunjung + Kunjungan)
        resultData = Visit.registerPublicVisit(payload);
        break;

      case 'visit:get':
        resultData = Visit.getVisitById(payload.visit_id);
        break;

      case 'visit:list':
        resultData = Visit.listVisits(payload.filters, payload.limit, payload.offset);
        break;

      case 'visit:update_status':
        resultData = Visit.updateVisitStatus(payload.visit_id, payload.status, payload.admin_id);
        break;

      // --- MODUL PRODUK (PRODUCT) ---
      case 'product:create':
        resultData = Product.createProduct(payload, payload.admin_role, payload.admin_id);
        break;

      case 'product:update':
        resultData = Product.updateProduct(payload, payload.admin_role, payload.admin_id);
        break;

      case 'product:toggle_status':
        resultData = Product.toggleProductStatus(payload.product_id, payload.status, payload.admin_role, payload.admin_id);
        break;

      case 'product:get':
        resultData = Product.getProductById(payload.product_id);
        break;

      case 'product:list':
        resultData = Product.listProducts(payload.filters);
        break;

      // --- MODUL INVENTARIS (INVENTORY) ---
      case 'inventory:create':
        resultData = Inventory.createInventoryItem(payload, payload.admin_role, payload.admin_id);
        break;

      case 'inventory:batch_create':
        resultData = Inventory.batchCreateInventory(payload, payload.admin_role, payload.admin_id);
        break;

      case 'inventory:update':
        resultData = Inventory.updateInventoryItem(payload, payload.admin_id);
        break;

      case 'inventory:get':
        resultData = Inventory.getInventoryById(payload.inventory_id);
        break;

      case 'inventory:get_by_code':
        resultData = Inventory.getInventoryByCode(payload.kode_barang);
        break;

      case 'inventory:list':
        resultData = Inventory.listInventory(payload.filters, payload.limit, payload.offset);
        break;

      case 'inventory:available':
        resultData = Inventory.getAvailableItems(payload.product_id);
        break;

      // --- MODUL TRANSAKSI (TRANSACTION) ---
      case 'transaction:create':
        resultData = Transaction.createTransaction(payload, payload.admin_id);
        break;

      case 'transaction:get':
        resultData = Transaction.getTransactionById(payload.transaction_id);
        break;

      case 'transaction:list':
        resultData = Transaction.listTransactions(payload.filters, payload.limit, payload.offset);
        break;

      case 'transaction:details':
        resultData = Response.success(Database.findAll('DETAIL_TRANSAKSI'), 'Daftar detail transaksi');
        break;

      case 'transaction:cancel':
        resultData = Transaction.cancelTransaction(payload.transaction_id, payload.alasan, payload.admin_id);
        break;

      // --- MODUL PEMBAYARAN (PAYMENT) ---
      case 'payment:cash':
        resultData = Payment.processCashPayment(payload, payload.admin_id);
        break;

      case 'payment:qris_initiate':
        resultData = Payment.initiateQrisPayment(payload, payload.admin_id);
        break;

      case 'payment:qris_verify':
        resultData = Payment.verifyQrisPayment(payload, payload.admin_id);
        break;

      case 'payment:list_by_trx':
        resultData = Payment.getPaymentsByTransaction(payload.transaction_id);
        break;

      case 'payment:dana_create':
        resultData = Payment.createDanaPayment(payload, payload.admin_id);
        break;

      case 'payment:dana_status':
        resultData = Payment.getDanaPaymentStatus(payload);
        break;

      case 'payment:dana_webhook':
        resultData = Payment.processDanaWebhook(payload);
        break;

      // --- MODUL PENGEMBALIAN (RETURN) ---
      case 'return:process':
        resultData = Return.processReturn(payload, payload.admin_id);
        break;

      case 'return:active_rentals':
        resultData = Return.getActiveRentals(payload.filters);
        break;

      case 'return:list':
        resultData = Return.listReturns(payload.filters, payload.limit, payload.offset);
        break;

      // --- MODUL AUTENTIKASI & PENGELOLA (AUTH) ---
      case 'auth:login':
        resultData = Auth.login(payload);
        break;

      case 'auth:create_admin':
        resultData = Auth.createAdmin(payload, payload.current_admin_role, payload.current_admin_id);
        break;

      case 'auth:update_admin':
        resultData = Auth.updateAdmin(payload, payload.current_admin_role, payload.current_admin_id);
        break;

      case 'auth:delete_admin':
        resultData = Auth.deleteAdmin(payload.admin_id, payload.current_admin_role, payload.current_admin_id);
        break;

      case 'auth:list_admins':
        resultData = Auth.listAdmins(payload.current_admin_role);
        break;

      case 'auth:bootstrap':
        resultData = Auth.bootstrapInitialSuperAdmin(payload);
        break;

      // --- MODUL LAPORAN & STATISTIK (REPORT) ---
      case 'report:dashboard':
        resultData = Report.getDashboardMetrics();
        break;

      case 'report:visits':
        resultData = Report.getVisitAnalytics(payload.filters || payload);
        break;

      case 'report:financial':
        resultData = Report.getFinancialAnalytics(payload.filters || payload);
        break;

      // --- MODUL MEDIA & FOTO KUSTOM WEBSITE ---
      case 'media:save':
        resultData = saveMediaCustom_(payload);
        break;

      case 'media:get':
        resultData = getMediaCustom_(payload);
        break;

      default:
        resultData = Response.error('Aksi [' + action + '] belum diimplementasikan atau tidak dikenali.');
        break;
    }

    return Response.toOutput(resultData);
  } catch (globalErr) {
    Logger.log('[CRITICAL ERROR] Terjadi unhandled error di doPost: ' + globalErr.message + '\n' + globalErr.stack);
    return Response.toOutput(Response.error('Kesalahan internal server backend: ' + globalErr.message));
  }
}

/**
 * Menyimpan data media kustom (foto/logo/qris) ke sheet PENGATURAN
 * Mendukung pembagian chunks Base64 agar muat dalam batas sel Google Sheets (50.000 karakter)
 */
function saveMediaCustom_(payload) {
  var key = String(payload.key || '').trim();
  if (!key) return Response.error('Key media wajib disertakan.');

  var mimeType = payload.mime_type || 'image/jpeg';
  var chunks = payload.chunks || [];
  var url = String(payload.url || '').trim();

  // Simpan / perbarui metadata
  var metaKey = 'media_meta_' + key;
  var metaVal = JSON.stringify({
    key: key,
    mimeType: mimeType,
    chunkCount: chunks.length,
    url: url,
    updatedAt: Utils.getNowWitaIsoString()
  });
  saveOrUpdateSettingRow_(metaKey, metaVal, 'Metadata media kustom ' + key);

  // Jika ada chunks data Base64
  for (var i = 0; i < chunks.length; i++) {
    saveOrUpdateSettingRow_('media_chunk_' + key + '_' + i, chunks[i], 'Chunk ' + i + ' media ' + key);
  }

  return Response.success({
    key: key,
    url: url || ('/api/media/custom/' + key),
    chunkCount: chunks.length
  }, 'Media kustom berhasil disimpan ke cloud database');
}

/**
 * Mengambil data media kustom yang tersimpan di sheet PENGATURAN
 */
function getMediaCustom_(payload) {
  var key = String(payload.key || '').trim();
  if (!key) return Response.error('Key media wajib disertakan.');

  var metaRows = Database.findAll('PENGATURAN', function(s) {
    return s.nama_pengaturan === ('media_meta_' + key);
  });

  if (metaRows.length === 0) {
    return Response.error('Media kustom tidak ditemukan');
  }

  try {
    var meta = JSON.parse(metaRows[0].nilai);
    var fullData = '';
    if (meta.chunkCount > 0) {
      for (var j = 0; j < meta.chunkCount; j++) {
        var chunkRow = Database.findAll('PENGATURAN', function(s) {
          return s.nama_pengaturan === ('media_chunk_' + key + '_' + j);
        });
        if (chunkRow.length > 0) {
          fullData += String(chunkRow[0].nilai || '');
        }
      }
    }

    return Response.success({
      key: key,
      mimeType: meta.mimeType || 'image/jpeg',
      data: fullData,
      url: meta.url || ''
    }, 'Data media kustom');
  } catch (err) {
    return Response.error('Gagal memproses metadata media: ' + err.message);
  }
}

/**
 * Helper untuk memperbarui atau menambahkan baris di sheet PENGATURAN
 */
function saveOrUpdateSettingRow_(settingName, val, desc) {
  var rows = Database.findAll('PENGATURAN', function(s) {
    return s.nama_pengaturan === settingName;
  });

  if (rows.length > 0) {
    Database.updateById('PENGATURAN', rows[0].setting_id, {
      nilai: val,
      diperbarui_pada: Utils.getNowWitaIsoString()
    });
  } else {
    var newId = 'SET-' + Utils.generateRandomId('MED', 6);
    Database.insert('PENGATURAN', {
      setting_id: newId,
      nama_pengaturan: settingName,
      nilai: val,
      keterangan: desc || ('Kustom ' + settingName),
      diperbarui_pada: Utils.getNowWitaIsoString()
    });
  }
}

/**
 * Memperbarui pengaturan sistem di sheet PENGATURAN
 */
function updateSettings_(payload) {
  var settings = payload.settings || {};
  var adminId = payload.admin_id || 'SUPER_ADMIN';
  var updatedCount = 0;

  var descriptions = {
    'jam_operasional_buka': 'Jam buka resmi kunjungan cagar budaya (WITA)',
    'jam_operasional_tutup': 'Jam tutup resmi kunjungan cagar budaya (WITA)',
    'denda_rusak_default': 'Tarif kompensasi perbaikan kerusakan busana adat (Rp)',
    'denda_hilang_default': 'Tarif penggantian kehilangan unit busana adat (Rp)'
  };

  for (var key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      var val = String(settings[key]);
      var desc = descriptions[key] || ('Pengaturan ' + key);
      saveOrUpdateSettingRow_(key, val, desc);
      updatedCount++;
    }
  }

  // Catat audit trail ke sheet LOG_AKTIVITAS
  try {
    if (typeof ActivityLog !== 'undefined' && ActivityLog.record) {
      ActivityLog.record(
        adminId,
        'UPDATE_PENGATURAN',
        'PENGATURAN',
        'SISTEM',
        'Memperbarui konfigurasi operasional (' + updatedCount + ' parameter)'
      );
    }
  } catch (e) {
    Logger.log('[LOG ERROR] ' + e.message);
  }

  return Response.success({
    updatedCount: updatedCount,
    settings: Database.findAll('PENGATURAN')
  }, 'Pengaturan sistem berhasil disimpan ke database Google Spreadsheet.');
}
