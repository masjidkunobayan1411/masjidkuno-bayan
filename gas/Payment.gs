/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Bisnis Manajemen Pembayaran Sewa Pakaian Adat
 * File: gas/Payment.gs
 * ============================================================================
 * 
 * Modul ini menangani pencatatan pelunasan transaksi sewa, verifikasi pembayaran
 * TUNAI, kesiapan integrasi QRIS resmi dengan status MENUNGGU_VERIFIKASI,
 * serta transisi otomatis status transaksi dan status unit fisik sewa.
 */

var Payment = (function() {
  /**
   * Pembayaran Tunai (Cash) Terverifikasi Petugas
   */
  function processCashPayment(payload, adminId) {
    var trxId = payload.transaction_id;
    var bayar = Number(payload.jumlah_bayar);
    var petugas = adminId || payload.diverifikasi_oleh || 'PETUGAS';

    if (!trxId) {
      return Response.error('transaction_id wajib disertakan.');
    }
    if (isNaN(bayar) || bayar <= 0) {
      return Response.error('Jumlah bayar harus berupa nominal rupiah valid lebih dari 0.');
    }

    return Database.withLock(function() {
      // 1. Verifikasi Keberadaan Transaksi
      var trx = Database.findById('TRANSAKSI', trxId);
      if (!trx) {
        return Response.error('Transaksi [' + trxId + '] tidak ditemukan.');
      }

      if (trx.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.LUNAS) {
        return Response.error('Transaksi [' + trxId + '] sudah berstatus LUNAS sebelumnya.');
      }
      if (trx.status_transaksi === CONFIG.STATUS.TRANSAKSI.DIBATALKAN) {
        return Response.error('Tidak dapat melakukan pembayaran pada transaksi yang sudah DIBATALKAN.');
      }

      var totalTagihan = Number(trx.total_harga);
      if (bayar < totalTagihan) {
        return Response.error('Jumlah pembayaran (Rp' + bayar.toLocaleString('id-ID') + ') kurang dari total tagihan sewa (Rp' + totalTagihan.toLocaleString('id-ID') + ').');
      }

      var kembalian = bayar - totalTagihan;
      var nowWita = Utils.getNowWitaIsoString();
      var cashRef = 'CASH-' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMddHHmmss');

      // 2. Simpan Catatan Pembayaran ke sheet PEMBAYARAN
      // CATATAN: Nominal yang dicatat sebagai pendapatan harus selalu NOMINAL HARGA SEWA BARANG (totalTagihan).
      // Uang tunai yang diserahkan (bayar) dan uang kembalian hanya ditampilkan di antarmuka kasir dan struk pembayaran.
      var paymentRecord = {
        transaction_id: trx.transaction_id,
        metode_pembayaran: CONFIG.STATUS.METODE_PEMBAYARAN.TUNAI,
        jumlah_bayar: totalTagihan,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.BERHASIL,
        referensi_gateway: cashRef,
        waktu_pembayaran: nowWita,
        diverifikasi_oleh: petugas
      };

      var savedPayment = Database.insert('PEMBAYARAN', paymentRecord);

      // 3. Perbarui Status Transaksi menjadi LUNAS dan DISEWA
      Database.updateById('TRANSAKSI', trxId, {
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.LUNAS,
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DISEWA
      });

      // 4. Ubah Status Seluruh Unit Inventaris Transaksi Menjadi DISEWA
      var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
        return d.transaction_id === trxId;
      });

      for (var i = 0; i < details.length; i++) {
        var invId = details[i].inventory_id;
        Database.updateById('INVENTARIS', invId, {
          status: CONFIG.STATUS.INVENTARIS.DISEWA
        });
      }

      // 5. Catat ke Audit Log
      ActivityLog.record(
        petugas,
        'PAYMENT_CASH_SUCCESS',
        'TRANSAKSI',
        trxId,
        'Pembayaran tunai diterima Rp' + bayar.toLocaleString('id-ID') + ' (Tagihan: Rp' + totalTagihan.toLocaleString('id-ID') + ', Kembalian: Rp' + kembalian.toLocaleString('id-ID') + ')'
      );

      return Response.success({
        payment: savedPayment,
        transaction_id: trxId,
        total_harga: totalTagihan,
        jumlah_bayar: bayar,
        kembalian: kembalian,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.LUNAS,
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DISEWA
      }, 'Pembayaran tunai berhasil diverifikasi');
    });
  }

  /**
   * Inisiasi Pembayaran QRIS (Dengan Status MENUNGGU_VERIFIKASI)
   * Sesuai Ketentuan E.4: QRIS tidak dinyatakan berhasil secara sembarangan
   * sebelum diverifikasi melalui server-side payment gateway yang sah.
   */
  function initiateQrisPayment(payload, adminId) {
    var trxId = payload.transaction_id;
    var petugas = adminId || payload.petugas_id || 'SISTEM';

    if (!trxId) {
      return Response.error('transaction_id wajib disertakan.');
    }

    return Database.withLock(function() {
      var trx = Database.findById('TRANSAKSI', trxId);
      if (!trx) {
        return Response.error('Transaksi [' + trxId + '] tidak ditemukan.');
      }

      if (trx.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.LUNAS) {
        return Response.error('Transaksi sudah berstatus LUNAS.');
      }

      var totalTagihan = Number(trx.total_harga);
      var orderRef = 'QRIS-' + trxId + '-' + new Date().getTime();
      var nowWita = Utils.getNowWitaIsoString();
      var metodePembayaran = payload.metode_pembayaran || CONFIG.STATUS.METODE_PEMBAYARAN.QRIS;

      var paymentRecord = {
        transaction_id: trxId,
        metode_pembayaran: metodePembayaran,
        jumlah_bayar: totalTagihan,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.MENUNGGU_VERIFIKASI,
        referensi_gateway: payload.referensi_gateway || orderRef,
        waktu_pembayaran: nowWita,
        diverifikasi_oleh: 'GATEWAY_PENDING'
      };

      var savedPayment = Database.insert('PEMBAYARAN', paymentRecord);

      Database.updateById('TRANSAKSI', trxId, {
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.MENUNGGU_VERIFIKASI
      });

      ActivityLog.record(
        petugas,
        'PAYMENT_QRIS_INITIATED',
        'TRANSAKSI',
        trxId,
        'Inisiasi tagihan QRIS Rp' + totalTagihan.toLocaleString('id-ID') + ' (Menunggu verifikasi resmi gateway)'
      );

      return Response.success({
        payment: savedPayment,
        transaction_id: trxId,
        total_harga: totalTagihan,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.MENUNGGU_VERIFIKASI,
        keterangan: 'QRIS dibuat. Menunggu notifikasi server-side webhook/verifikasi gateway resmi.'
      }, 'Tagihan QRIS berhasil dibuat dan berstatus MENUNGGU_VERIFIKASI');
    });
  }

  /**
   * Verifikasi Pembayaran QRIS Resmi (Server-to-Server Gateway Webhook / Verifikasi Manual Petugas)
   */
  function verifyQrisPayment(payload, adminId) {
    var trxId = payload.transaction_id;
    var paymentId = payload.payment_id;
    var referensiGateway = payload.referensi_gateway;
    var petugas = adminId || 'SISTEM_GATEWAY';
    var metodePembayaran = payload.metode_pembayaran || CONFIG.STATUS.METODE_PEMBAYARAN.QRIS;

    if (!trxId) {
      return Response.error('transaction_id wajib disertakan.');
    }
    if (!referensiGateway) {
      referensiGateway = 'QRIS-BYN-' + new Date().getTime();
    }

    return Database.withLock(function() {
      var trx = Database.findById('TRANSAKSI', trxId);
      if (!trx) {
        return Response.error('Transaksi [' + trxId + '] tidak ditemukan.');
      }

      // Cari record pembayaran QRIS terkait (apapun varian QRIS: BAYANNESIA, BUMDES, atau QRIS umum)
      var payments = Database.findAll('PEMBAYARAN', function(p) {
        if (paymentId) return p.payment_id === paymentId;
        var pMetode = String(p.metode_pembayaran || '').toUpperCase();
        return p.transaction_id === trxId && pMetode.indexOf('QRIS') !== -1;
      });

      var targetPayment = null;
      var nowWita = Utils.getNowWitaIsoString();

      if (payments.length > 0) {
        targetPayment = payments[payments.length - 1]; // Ambil yang paling mutakhir
        // 1. Update status pembayaran menjadi BERHASIL
        Database.updateById('PEMBAYARAN', targetPayment.payment_id, {
          status_pembayaran: CONFIG.STATUS.PEMBAYARAN.BERHASIL,
          metode_pembayaran: metodePembayaran,
          referensi_gateway: referensiGateway,
          diverifikasi_oleh: petugas,
          waktu_pembayaran: nowWita
        });
      } else {
        // Jika kasir langsung verifikasi tanpa inisiasi, buat record pembayaran baru
        var newPayId = Utils.generateId(CONFIG.ID_PREFIX.PEMBAYARAN, 'TRANSAKSI');
        targetPayment = Database.insert('PEMBAYARAN', {
          payment_id: newPayId,
          transaction_id: trxId,
          metode_pembayaran: metodePembayaran,
          jumlah_bayar: Number(trx.total_harga || 0),
          status_pembayaran: CONFIG.STATUS.PEMBAYARAN.BERHASIL,
          referensi_gateway: referensiGateway,
          diverifikasi_oleh: petugas,
          waktu_pembayaran: nowWita
        });
      }

      // 2. Update status transaksi menjadi LUNAS dan DISEWA beserta metode pembayaran
      Database.updateById('TRANSAKSI', trxId, {
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.LUNAS,
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DISEWA,
        metode_pembayaran: metodePembayaran
      });

      // 3. Kunci unit inventaris menjadi DISEWA
      var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
        return d.transaction_id === trxId;
      });

      for (var i = 0; i < details.length; i++) {
        Database.updateById('INVENTARIS', details[i].inventory_id, {
          status: CONFIG.STATUS.INVENTARIS.DISEWA
        });
      }

      ActivityLog.record(
        petugas,
        'PAYMENT_QRIS_VERIFIED',
        'TRANSAKSI',
        trxId,
        'Pembayaran ' + metodePembayaran + ' terverifikasi sah dengan referensi: ' + referensiGateway
      );

      return Response.success({
        transaction_id: trxId,
        payment_id: targetPayment.payment_id,
        metode_pembayaran: metodePembayaran,
        referensi_gateway: referensiGateway,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.LUNAS,
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DISEWA
      }, 'Pembayaran ' + metodePembayaran + ' berhasil diverifikasi');
    });
  }

  /**
   * Mengambil Riwayat Pembayaran untuk Transaksi Tertentu
   */
  function getPaymentsByTransaction(transactionId) {
    if (!transactionId) {
      return Response.error('transaction_id wajib disertakan.');
    }

    var payments = Database.findAll('PEMBAYARAN', function(p) {
      return p.transaction_id === transactionId;
    });

    return Response.success(payments, 'Riwayat pembayaran transaksi');
  }

  /**
   * Mencatat Transaksi Pembuatan QRIS Dinamis DANA Resmi ke Spreadsheet
   */
  function createDanaPayment(payload, adminId) {
    var trxId = payload.order_id || payload.transaction_id;
    var externalId = payload.external_id;
    var amount = Number(payload.amount);
    var qrContent = payload.qr_content;
    var expiredAt = payload.expired_at;
    var petugas = adminId || 'SISTEM_DANA';

    if (!trxId) {
      return Response.error('order_id / transaction_id wajib disertakan.');
    }
    if (!externalId) {
      return Response.error('external_id wajib disertakan.');
    }

    return Database.withLock(function() {
      var trx = Database.findById('TRANSAKSI', trxId);
      if (!trx) {
        return Response.error('Transaksi [' + trxId + '] tidak ditemukan.');
      }

      if (trx.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.LUNAS) {
        return Response.error('Transaksi sudah berstatus LUNAS.');
      }

      var totalTagihan = amount > 0 ? amount : Number(trx.total_harga || 0);
      var nowWita = Utils.getNowWitaIsoString();
      var payId = Utils.generateId(CONFIG.ID_PREFIX.PAYMENTS, 'TRANSAKSI');

      // 1. Simpan ke sheet resmi PAYMENTS (Standar DANA Developer)
      var danaPaymentRecord = {
        payment_id: payId,
        order_id: trxId,
        external_id: externalId,
        dana_reference_no: payload.dana_reference_no || '',
        amount: totalTagihan,
        currency: 'IDR',
        qr_content: qrContent || '',
        status: 'PENDING',
        created_at: nowWita,
        expired_at: expiredAt || '',
        paid_at: ''
      };
      var savedDanaPayment = Database.insert('PAYMENTS', danaPaymentRecord);

      // 2. Sinkronkan ke sheet PEMBAYARAN (Kompatibilitas laporan & kasir eksisting)
      var legacyPaymentRecord = {
        payment_id: payId,
        transaction_id: trxId,
        metode_pembayaran: CONFIG.STATUS.METODE_PEMBAYARAN.QRIS,
        jumlah_bayar: totalTagihan,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.MENUNGGU_VERIFIKASI,
        referensi_gateway: externalId,
        waktu_pembayaran: nowWita,
        diverifikasi_oleh: 'DANA_GATEWAY_PENDING'
      };
      Database.insert('PEMBAYARAN', legacyPaymentRecord);

      // 3. Perbarui status pembayaran pada sheet TRANSAKSI
      Database.updateById('TRANSAKSI', trxId, {
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.MENUNGGU_VERIFIKASI,
        metode_pembayaran: CONFIG.STATUS.METODE_PEMBAYARAN.QRIS
      });

      // 4. Catat ke Activity Log
      ActivityLog.record(
        petugas,
        'DANA_QRIS_CREATED',
        'TRANSAKSI',
        trxId,
        'QRIS Dinamis DANA dibuat: ' + externalId + ' sejumlah Rp' + totalTagihan.toLocaleString('id-ID')
      );

      return Response.success({
        payment: savedDanaPayment,
        order_id: trxId,
        external_id: externalId,
        amount: totalTagihan,
        qr_content: qrContent,
        expired_at: expiredAt,
        status: 'PENDING'
      }, 'Transaksi QRIS Dinamis DANA berhasil dicatat');
    });
  }

  /**
   * Mengambil Status Pembayaran DANA dari Database Spreadsheet
   */
  function getDanaPaymentStatus(payload) {
    var trxId = payload.order_id || payload.transaction_id;
    var externalId = payload.external_id;

    if (!trxId && !externalId) {
      return Response.error('order_id atau external_id wajib disertakan.');
    }

    var payment = null;
    var payments = Database.findAll('PAYMENTS', function(p) {
      if (externalId && p.external_id === externalId) return true;
      if (trxId && p.order_id === trxId) return true;
      return false;
    });

    if (payments.length > 0) {
      payment = payments[payments.length - 1];
    } else {
      // Fallback ke sheet PEMBAYARAN
      var legPayments = Database.findAll('PEMBAYARAN', function(p) {
        if (externalId && p.referensi_gateway === externalId) return true;
        if (trxId && p.transaction_id === trxId) return true;
        return false;
      });
      if (legPayments.length > 0) {
        var lp = legPayments[legPayments.length - 1];
        payment = {
          payment_id: lp.payment_id,
          order_id: lp.transaction_id,
          external_id: lp.referensi_gateway,
          amount: lp.jumlah_bayar,
          status: lp.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.LUNAS || lp.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.BERHASIL ? 'PAID' : 'PENDING',
          paid_at: lp.waktu_pembayaran
        };
      }
    }

    if (!payment) {
      return Response.error('Catatan pembayaran tidak ditemukan.');
    }

    var isPaid = payment.status === 'PAID' || payment.status === CONFIG.STATUS.PEMBAYARAN.LUNAS || payment.status === CONFIG.STATUS.PEMBAYARAN.BERHASIL;

    return Response.success({
      payment_id: payment.payment_id,
      order_id: payment.order_id,
      external_id: payment.external_id,
      amount: payment.amount,
      status: isPaid ? 'PAID' : (payment.status || 'PENDING'),
      paid_at: payment.paid_at || '',
      is_paid: isPaid
    }, 'Status pembayaran DANA');
  }

  /**
   * Memproses Webhook Resmi Finish Notify DANA (Idempotent & Atomic)
   */
  function processDanaWebhook(payload) {
    var trxId = payload.order_id || payload.transaction_id;
    var externalId = payload.external_id;
    var danaRefNo = payload.dana_reference_no || '';
    var amount = Number(payload.amount);
    var signatureValid = Boolean(payload.signature_valid);
    var nowWita = Utils.getNowWitaIsoString();

    if (!trxId) {
      return Response.error('order_id / transaction_id wajib disertakan.');
    }

    return Database.withLock(function() {
      // 1. Simpan riwayat raw webhook ke sheet WEBHOOK_LOGS
      var webhookId = Utils.generateId(CONFIG.ID_PREFIX.WEBHOOK_LOGS, 'TRANSAKSI');
      var webhookLog = {
        webhook_id: webhookId,
        payment_id: '',
        event_type: 'FINISH_NOTIFY',
        signature_valid: signatureValid ? 'VALID' : 'INVALID',
        processing_status: signatureValid ? 'PROCESSED' : 'REJECTED_SIGNATURE',
        received_at: nowWita,
        processed_at: nowWita
      };

      if (!signatureValid) {
        webhookLog.processing_status = 'REJECTED_SIGNATURE';
        Database.insert('WEBHOOK_LOGS', webhookLog);
        return Response.error('Signature webhook DANA tidak valid. Permintaan ditolak.');
      }

      // 2. Cari transaksi di TRANSAKSI
      var trx = Database.findById('TRANSAKSI', trxId);
      if (!trx) {
        webhookLog.processing_status = 'FAILED_TRX_NOT_FOUND';
        Database.insert('WEBHOOK_LOGS', webhookLog);
        return Response.error('Transaksi [' + trxId + '] tidak ditemukan.');
      }

      // 3. IDEMPOTENCY CHECK: Jika transaksi sudah LUNAS, jangan proses ulang inventaris
      if (trx.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.LUNAS) {
        webhookLog.processing_status = 'IDEMPOTENT_ALREADY_PAID';
        Database.insert('WEBHOOK_LOGS', webhookLog);
        return Response.success({
          order_id: trxId,
          status: 'PAID',
          message: 'Transaksi sudah berstatus LUNAS sebelumnya (Idempotent).'
        });
      }

      // 4. Update status di sheet PAYMENTS
      var payments = Database.findAll('PAYMENTS', function(p) {
        if (externalId && p.external_id === externalId) return true;
        return p.order_id === trxId;
      });

      var targetPayment = null;
      if (payments.length > 0) {
        targetPayment = payments[payments.length - 1];
        Database.updateById('PAYMENTS', targetPayment.payment_id, {
          status: 'PAID',
          dana_reference_no: danaRefNo,
          paid_at: payload.paid_at || nowWita
        });
        webhookLog.payment_id = targetPayment.payment_id;
      }

      // 5. Update/Insert ke sheet PEMBAYARAN
      var legPayments = Database.findAll('PEMBAYARAN', function(p) {
        return p.transaction_id === trxId;
      });

      if (legPayments.length > 0) {
        var targetLeg = legPayments[legPayments.length - 1];
        Database.updateById('PEMBAYARAN', targetLeg.payment_id, {
          status_pembayaran: CONFIG.STATUS.PEMBAYARAN.BERHASIL,
          referensi_gateway: danaRefNo || externalId,
          diverifikasi_oleh: 'DANA_WEBHOOK',
          waktu_pembayaran: payload.paid_at || nowWita
        });
        if (!webhookLog.payment_id) webhookLog.payment_id = targetLeg.payment_id;
      } else {
        var newPayId = Utils.generateId(CONFIG.ID_PREFIX.PEMBAYARAN, 'TRANSAKSI');
        Database.insert('PEMBAYARAN', {
          payment_id: newPayId,
          transaction_id: trxId,
          metode_pembayaran: CONFIG.STATUS.METODE_PEMBAYARAN.QRIS,
          jumlah_bayar: amount > 0 ? amount : Number(trx.total_harga || 0),
          status_pembayaran: CONFIG.STATUS.PEMBAYARAN.BERHASIL,
          referensi_gateway: danaRefNo || externalId,
          diverifikasi_oleh: 'DANA_WEBHOOK',
          waktu_pembayaran: payload.paid_at || nowWita
        });
        if (!webhookLog.payment_id) webhookLog.payment_id = newPayId;
      }

      // 6. Simpan webhook log yang sudah terisi payment_id
      Database.insert('WEBHOOK_LOGS', webhookLog);

      // 7. Update status transaksi menjadi LUNAS dan DISEWA
      Database.updateById('TRANSAKSI', trxId, {
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.LUNAS,
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DISEWA,
        metode_pembayaran: CONFIG.STATUS.METODE_PEMBAYARAN.QRIS
      });

      // 8. Kunci seluruh unit inventaris menjadi DISEWA
      var details = Database.findAll('DETAIL_TRANSAKSI', function(d) {
        return d.transaction_id === trxId;
      });

      for (var i = 0; i < details.length; i++) {
        Database.updateById('INVENTARIS', details[i].inventory_id, {
          status: CONFIG.STATUS.INVENTARIS.DISEWA
        });
      }

      // 9. Catat ke Activity Log
      ActivityLog.record(
        'DANA_WEBHOOK',
        'PAYMENT_DANA_SUCCESS',
        'TRANSAKSI',
        trxId,
        'Pelunasan QRIS DANA terverifikasi sah. Ref: ' + (danaRefNo || externalId) + ', Nominal: Rp' + Number(trx.total_harga || 0).toLocaleString('id-ID')
      );

      return Response.success({
        order_id: trxId,
        external_id: externalId,
        dana_reference_no: danaRefNo,
        status: 'PAID',
        status_transaksi: CONFIG.STATUS.TRANSAKSI.DISEWA,
        status_pembayaran: CONFIG.STATUS.PEMBAYARAN.LUNAS
      }, 'Pembayaran DANA berhasil diproses & disahkan');
    });
  }

  return {
    processCashPayment: processCashPayment,
    initiateQrisPayment: initiateQrisPayment,
    verifyQrisPayment: verifyQrisPayment,
    getPaymentsByTransaction: getPaymentsByTransaction,
    createDanaPayment: createDanaPayment,
    getDanaPaymentStatus: getDanaPaymentStatus,
    processDanaWebhook: processDanaWebhook
  };
})();
