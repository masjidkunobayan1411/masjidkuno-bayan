/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Agregasi Laporan Statistik & Analisis Operasional
 * File: gas/Report.gs
 * ============================================================================
 * 
 * Modul ini menyediakan agregasi metrik analitik dashboard, statistik
 * demografis pengunjung (domestik vs mancanegara, asal daerah), laporan keuangan
 * penyewaan pakaian adat, serta audit inventaris berdasarkan zona waktu WITA.
 */

var Report = (function() {
  /**
   * Helper untuk menghasilkan daftar N hari terakhir dalam format YYYY-MM-DD WITA
   */
  function getLastNDaysWita_(daysCount) {
    var dates = [];
    var now = new Date();
    for (var i = daysCount - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      dates.push(Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd'));
    }
    return dates;
  }

  /**
   * Helper untuk mengekstrak string tanggal YYYY-MM-DD aman dari Date object atau string sel
   */
  function extractDateString_(val) {
    if (!val) return '';
    if (val instanceof Date) {
      return Utilities.formatDate(val, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    }
    var s = String(val).trim();
    if (s.indexOf('T') !== -1) {
      return s.split('T')[0];
    }
    var m = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    try {
      var d = new Date(s);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      }
    } catch(e) {}
    return s;
  }

  /**
   * Mengambil Ringkasan Metrik Real-Time untuk Dashboard Admin
   */
  function getDashboardMetrics() {
    var todayWita = Utils.getTodayWitaString();
    var currentMonthWita = todayWita.substring(0, 7); // YYYY-MM

    // 1. Ambil Data Kunjungan & Pengunjung
    var allVisits = Database.findAll('KUNJUNGAN');
    var allVisitors = Database.findAll('PENGUNJUNG');
    var visitorMap = {};
    allVisitors.forEach(function(v) { visitorMap[v.visitor_id] = v; });

    var kunjunganHariIni = 0;
    var pengunjungHariIni = 0;
    var dewasaHariIni = 0;
    var anakHariIni = 0;

    var kunjunganBulanIni = 0;
    var pengunjungBulanIni = 0;
    var dewasaBulanIni = 0;
    var anakBulanIni = 0;

    var domestikCount = 0;
    var mancanegaraCount = 0;

    allVisits.forEach(function(v) {
      var tgl = extractDateString_(v.tanggal_kunjungan);
      var total = Number(v.total_pengunjung || 0);
      var dewasa = Number(v.jumlah_dewasa || 0);
      var anak = Number(v.jumlah_anak || 0);

      // Metrik Hari Ini
      if (tgl === todayWita) {
        kunjunganHariIni++;
        pengunjungHariIni += total;
        dewasaHariIni += dewasa;
        anakHariIni += anak;
      }

      // Metrik Bulan Ini
      if (tgl.indexOf(currentMonthWita) === 0) {
        kunjunganBulanIni++;
        pengunjungBulanIni += total;
        dewasaBulanIni += dewasa;
        anakBulanIni += anak;

        var vProf = visitorMap[v.visitor_id] || {};
        if (vProf.jenis_pengunjung === 'MANCANEGARA') {
          mancanegaraCount += total;
        } else {
          domestikCount += total;
        }
      }
    });

    // 2. Grafik Tren Kunjungan 7 Hari Terakhir
    var last7Days = getLastNDaysWita_(7);
    var trend7Days = last7Days.map(function(dateStr) {
      var kCount = 0;
      var pCount = 0;
      var dCount = 0;
      var aCount = 0;

      allVisits.forEach(function(v) {
        var tgl = extractDateString_(v.tanggal_kunjungan);
        if (tgl === dateStr) {
          kCount++;
          pCount += Number(v.total_pengunjung || 0);
          dCount += Number(v.jumlah_dewasa || 0);
          aCount += Number(v.jumlah_anak || 0);
        }
      });

      return {
        tanggal: dateStr,
        kunjungan: kCount,
        pengunjung: pCount,
        dewasa: dCount,
        anak: aCount
      };
    });

    // 3. Ambil Data Transaksi & Pembayaran Keuangan
    var allPayments = Database.findAll('PEMBAYARAN');
    var allTrx = Database.findAll('TRANSAKSI');
    var trxMap = {};
    allTrx.forEach(function(t) { trxMap[t.transaction_id] = t; });

    var pendapatanHariIni = 0;
    var pendapatanBulanIni = 0;

    allPayments.forEach(function(p) {
      if (p.status_pembayaran === CONFIG.STATUS.PEMBAYARAN.BERHASIL) {
        var w = extractDateString_(p.waktu_pembayaran);
        var trx = trxMap[p.transaction_id];
        // Selalu gunakan nominal harga sewa barang resmi (trx.total_harga) agar uang lebih/kembalian tidak terhitung
        var bayar = (trx && Number(trx.total_harga) > 0) ? Number(trx.total_harga) : Number(p.jumlah_bayar || 0);

        if (w === todayWita) {
          pendapatanHariIni += bayar;
        }
        if (w.indexOf(currentMonthWita) === 0) {
          pendapatanBulanIni += bayar;
        }
      }
    });

    // 4. Status Transaksi Sewa Berjalan
    var allTransactions = Database.findAll('TRANSAKSI');
    var sewaAktif = 0;
    var unitSedangDipakaiTrx = 0;
    allTransactions.forEach(function(t) {
      if (t.status_transaksi === CONFIG.STATUS.TRANSAKSI.DISEWA) {
        sewaAktif++;
        unitSedangDipakaiTrx += Number(t.total_barang || 1);
      }
    });

    // 5. Ringkasan Status Unit Inventaris
    var allInventory = Database.findAll('INVENTARIS');
    var invSummary = {
      total: allInventory.length,
      tersedia: 0,
      disewa: 0,
      ditahan: 0,
      perawatan: 0,
      rusak: 0,
      hilang: 0
    };

    allInventory.forEach(function(inv) {
      var st = String(inv.status).toUpperCase().trim();
      if (st === CONFIG.STATUS.INVENTARIS.TERSEDIA) invSummary.tersedia++;
      else if (st === CONFIG.STATUS.INVENTARIS.DISEWA) invSummary.disewa++;
      else if (st === CONFIG.STATUS.INVENTARIS.DITAHAN) invSummary.ditahan++;
      else if (st === CONFIG.STATUS.INVENTARIS.PERAWATAN) invSummary.perawatan++;
      else if (st === CONFIG.STATUS.INVENTARIS.RUSAK) invSummary.rusak++;
      else if (st === CONFIG.STATUS.INVENTARIS.HILANG) invSummary.hilang++;
    });

    var finalUnitDipakai = invSummary.disewa > 0 ? invSummary.disewa : unitSedangDipakaiTrx;

    // 6. Aktivitas Terkini (10 entri terakhir)
    var recentActivities = ActivityLog.getRecent(10);

    return Response.success({
      waktu_server: Utils.getNowWitaIsoString(),
      tanggal_hari_ini: todayWita,
      bulan_ini: currentMonthWita,
      hari_ini: {
        kunjungan: kunjunganHariIni,
        pengunjung: pengunjungHariIni,
        dewasa: dewasaHariIni,
        anak: anakHariIni,
        pendapatan: pendapatanHariIni
      },
      bulan_ini_data: {
        kunjungan: kunjunganBulanIni,
        pengunjung: pengunjungBulanIni,
        dewasa: dewasaBulanIni,
        anak: anakBulanIni,
        pendapatan: pendapatanBulanIni
      },
      sewa_aktif: sewaAktif,
      unit_sedang_dipakai: finalUnitDipakai,
      demografi_bulan_ini: {
        domestik: domestikCount,
        mancanegara: mancanegaraCount
      },
      inventaris: invSummary,
      grafik_tren_7_hari: trend7Days,
      aktivitas_terkini: recentActivities
    }, 'Ringkasan metrik dashboard');
  }

  /**
   * Laporan Analisis Kunjungan & Demografis dengan Filter Rentang Waktu
   */
  function getVisitAnalytics(filters) {
    var f = filters || {};
    var isAll = f.all === true || f.preset === 'ALL' || (!f.start_date && !f.end_date && f.is_preset_all);
    var hasFilter = (f.start_date !== undefined && f.start_date !== null && f.start_date !== '') ||
                    (f.end_date !== undefined && f.end_date !== null && f.end_date !== '');

    var startDate = f.start_date || '';
    var endDate = f.end_date || '';

    // Hanya default ke 30 hari jika benar-benar tidak ada filter dan bukan permintaan 'ALL'
    if (!isAll && !hasFilter) {
      startDate = getLastNDaysWita_(30)[0];
      endDate = Utils.getTodayWitaString();
    }

    var allVisits = Database.findAll('KUNJUNGAN', function(v) {
      var tgl = extractDateString_(v.tanggal_kunjungan);
      if (startDate && tgl < startDate) return false;
      if (endDate && tgl > endDate) return false;
      return true;
    });

    var allVisitors = Database.findAll('PENGUNJUNG');
    var visitorMap = {};
    allVisitors.forEach(function(v) { visitorMap[v.visitor_id] = v; });

    var totalKunjungan = allVisits.length;
    var totalPengunjung = 0;
    var totalDewasa = 0;
    var totalAnak = 0;

    var harianMap = {};
    var provinsiMap = {};
    var kabKotaMap = {};
    var negaraMap = {};
    var tujuanMap = {};
    var tipeMap = { DOMESTIK: 0, MANCANEGARA: 0 };

    allVisits.forEach(function(v) {
      var tgl = extractDateString_(v.tanggal_kunjungan);
      var total = Number(v.total_pengunjung || 0);
      var dewasa = Number(v.jumlah_dewasa || 0);
      var anak = Number(v.jumlah_anak || 0);

      totalPengunjung += total;
      totalDewasa += dewasa;
      totalAnak += anak;

      // Agregasi Harian
      if (!harianMap[tgl]) {
        harianMap[tgl] = { tanggal: tgl, kunjungan: 0, pengunjung: 0, dewasa: 0, anak: 0 };
      }
      harianMap[tgl].kunjungan++;
      harianMap[tgl].pengunjung += total;
      harianMap[tgl].dewasa += dewasa;
      harianMap[tgl].anak += anak;

      // Tujuan Kunjungan
      var tuj = v.tujuan_kunjungan || 'LAINNYA';
      tujuanMap[tuj] = (tujuanMap[tuj] || 0) + total;

      // Demografis
      var vProf = visitorMap[v.visitor_id] || {};
      var jenis = vProf.jenis_pengunjung || 'DOMESTIK';
      tipeMap[jenis] = (tipeMap[jenis] || 0) + total;

      if (jenis === 'DOMESTIK') {
        var prov = vProf.provinsi || 'LAINNYA';
        provinsiMap[prov] = (provinsiMap[prov] || 0) + total;

        var kab = vProf.kabupaten_kota || 'LAINNYA';
        kabKotaMap[kab] = (kabKotaMap[kab] || 0) + total;
      } else {
        var neg = vProf.negara || 'LAINNYA';
        negaraMap[neg] = (negaraMap[neg] || 0) + total;
      }
    });

    // Urutkan Tren Harian
    var harianList = Object.keys(harianMap).sort().map(function(k) { return harianMap[k]; });

    // Helper untuk mengurutkan Top N
    function getTopN_(objMap, n) {
      return Object.keys(objMap).map(function(k) {
        return { label: k, total: objMap[k] };
      }).sort(function(a, b) {
        return b.total - a.total;
      }).slice(0, n || 10);
    }

    return Response.success({
      periode: { start_date: startDate, end_date: endDate },
      ringkasan: {
        total_kunjungan: totalKunjungan,
        total_pengunjung: totalPengunjung,
        total_dewasa: totalDewasa,
        total_anak: totalAnak,
        rata_rata_per_kunjungan: totalKunjungan > 0 ? (totalPengunjung / totalKunjungan).toFixed(1) : 0
      },
      jenis_pengunjung: tipeMap,
      top_provinsi: getTopN_(provinsiMap, 10),
      top_kabupaten_kota: getTopN_(kabKotaMap, 10),
      top_negara_mancanegara: getTopN_(negaraMap, 10),
      tujuan_kunjungan: getTopN_(tujuanMap, 10),
      deret_harian: harianList
    }, 'Laporan statistik kunjungan dan demografi');
  }

  /**
   * Laporan Keuangan Penyewaan Pakaian Adat & Produk Terpopuler
   */
  function getFinancialAnalytics(filters) {
    var f = filters || {};
    var isAll = f.all === true || f.preset === 'ALL' || (!f.start_date && !f.end_date && f.is_preset_all);
    var hasFilter = (f.start_date !== undefined && f.start_date !== null && f.start_date !== '') ||
                    (f.end_date !== undefined && f.end_date !== null && f.end_date !== '');

    var startDate = f.start_date || '';
    var endDate = f.end_date || '';

    // Hanya default ke 30 hari jika benar-benar tidak ada filter dan bukan permintaan 'ALL'
    if (!isAll && !hasFilter) {
      startDate = getLastNDaysWita_(30)[0];
      endDate = Utils.getTodayWitaString();
    }

    var allPayments = Database.findAll('PEMBAYARAN', function(p) {
      var s = String(p.status_pembayaran || '').toUpperCase().trim();
      if (s !== CONFIG.STATUS.PEMBAYARAN.BERHASIL && s !== 'LUNAS' && s !== 'BERHASIL') return false;
      var w = extractDateString_(p.waktu_pembayaran);
      if (startDate && w < startDate) return false;
      if (endDate && w > endDate) return false;
      return true;
    });

    var allTrx = Database.findAll('TRANSAKSI');
    var trxMap = {};
    allTrx.forEach(function(t) { trxMap[t.transaction_id] = t; });

    var totalPendapatan = 0;
    var totalTunai = 0;
    var totalQris = 0;
    var totalQrisBayannesia = 0;
    var totalQrisBumdes = 0;
    var omsetHarianMap = {};

    allPayments.forEach(function(p) {
      var trx = trxMap[p.transaction_id];
      // Selalu gunakan harga sewa barang resmi (trx.total_harga) agar uang lebih/kembalian tidak terhitung ke pendapatan
      var bayar = (trx && Number(trx.total_harga) > 0) ? Number(trx.total_harga) : Number(p.jumlah_bayar || 0);
      var metode = String(p.metode_pembayaran || (trx ? trx.metode_pembayaran : '') || '').toUpperCase().trim();
      var tgl = extractDateString_(p.waktu_pembayaran);

      totalPendapatan += bayar;
      if (metode === CONFIG.STATUS.METODE_PEMBAYARAN.TUNAI || metode === 'TUNAI') {
        totalTunai += bayar;
      } else if (metode.indexOf('QRIS') !== -1 || metode.indexOf('BAYANNESIA') !== -1 || metode.indexOf('BUMDES') !== -1) {
        totalQris += bayar;
        if (metode.indexOf('BUMDES') !== -1) {
          totalQrisBumdes += bayar;
        } else {
          totalQrisBayannesia += bayar;
        }
      } else {
        totalTunai += bayar;
      }

      if (!omsetHarianMap[tgl]) {
        omsetHarianMap[tgl] = { tanggal: tgl, total: 0, tunai: 0, qris: 0 };
      }
      omsetHarianMap[tgl].total += bayar;
      if (metode === CONFIG.STATUS.METODE_PEMBAYARAN.TUNAI || metode === 'TUNAI') {
        omsetHarianMap[tgl].tunai += bayar;
      } else {
        omsetHarianMap[tgl].qris += bayar;
      }
    });

    // Analisis Produk Paling Banyak Disewa
    var allDetails = Database.findAll('DETAIL_TRANSAKSI');
    var allTrx = Database.findAll('TRANSAKSI');
    var trxDateMap = {};
    allTrx.forEach(function(t) { trxDateMap[t.transaction_id] = t.tanggal_transaksi; });

    var productPopularityMap = {};
    allDetails.forEach(function(d) {
      var trxDate = extractDateString_(trxDateMap[d.transaction_id]);
      if ((!startDate || trxDate >= startDate) && (!endDate || trxDate <= endDate)) {
        var pid = d.product_id;
        if (!productPopularityMap[pid]) {
          productPopularityMap[pid] = {
            product_id: pid,
            nama_produk: d.nama_produk_snapshot,
            total_disewa: 0,
            total_pendapatan: 0
          };
        }
        productPopularityMap[pid].total_disewa += Number(d.jumlah || 1);
        productPopularityMap[pid].total_pendapatan += Number(d.subtotal || 0);
      }
    });

    var rankedProducts = Object.keys(productPopularityMap).map(function(k) {
      return productPopularityMap[k];
    }).sort(function(a, b) {
      return b.total_disewa - a.total_disewa;
    });

    var omsetHarianList = Object.keys(omsetHarianMap).sort().map(function(k) {
      return omsetHarianMap[k];
    });

    return Response.success({
      periode: { start_date: startDate, end_date: endDate },
      ringkasan: {
        total_pendapatan: totalPendapatan,
        total_tunai: totalTunai,
        total_qris: totalQris,
        total_qris_bayannesia: totalQrisBayannesia,
        total_qris_bumdes: totalQrisBumdes,
        total_transaksi_sukses: allPayments.length
      },
      produk_terpopuler: rankedProducts,
      omset_harian: omsetHarianList,
      pembayaran_items: allPayments
    }, 'Laporan keuangan penyewaan pakaian adat');
  }

  return {
    getDashboardMetrics: getDashboardMetrics,
    getVisitAnalytics: getVisitAnalytics,
    getFinancialAnalytics: getFinancialAnalytics
  };
})();
