/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Ekspor Laporan Dokumen Excel (.xlsx via ExcelJS)
 * Endpoint: GET /api/reports/export
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get("start_date") || "";
    const end_date = searchParams.get("end_date") || "";

    const filters = {
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      all: !start_date && !end_date,
    };

    // Ambil data agregasi analitik, kunjungan, transaksi, dan rincian item transaksi
    const [visitReportRes, finReportRes, visitListRes, trxListRes, trxDetailsRes] = await Promise.all([
      callGasApi("report:visits", {
        filters,
        start_date: filters.start_date,
        end_date: filters.end_date,
        all: filters.all,
      }),
      callGasApi("report:financial", {
        filters,
        start_date: filters.start_date,
        end_date: filters.end_date,
        all: filters.all,
      }),
      callGasApi("visit:list", { filters, limit: 1000 }),
      callGasApi("transaction:list", { filters, limit: 1000 }),
      callGasApi("transaction:details", {}),
    ]);

    const vReport = visitReportRes.data || {};
    const fReport = finReportRes.data || {};
    const rawVisits = (visitListRes.data?.items || []) as any[];
    const rawTransactions = (trxListRes.data?.items || []) as any[];

    // Saring kunjungan dan transaksi secara presisi sesuai rentang tanggal yang diminta
    const visits = rawVisits.filter((v: any) => {
      const tgl = String(v.tanggal_kunjungan || "").trim().split("T")[0];
      if (start_date && tgl < start_date) return false;
      if (end_date && tgl > end_date) return false;
      return true;
    });

    const transactions = rawTransactions.filter((t: any) => {
      const tgl = String(t.tanggal_transaksi || "").trim().split("T")[0];
      if (start_date && tgl < start_date) return false;
      if (end_date && tgl > end_date) return false;
      return true;
    });

    // Map Rincian Transaksi untuk fallback penghitungan Kain Poleng & Kain Batik
    const detailsMap = new Map<string, { poleng: number; batik: number }>();
    const rawDetails = Array.isArray(trxDetailsRes?.data)
      ? (trxDetailsRes.data as any[])
      : Array.isArray(trxDetailsRes?.data?.items)
      ? (trxDetailsRes.data.items as any[])
      : [];

    rawDetails.forEach((d: any) => {
      const trxId = d.transaction_id;
      if (!trxId) return;
      if (!detailsMap.has(trxId)) {
        detailsMap.set(trxId, { poleng: 0, batik: 0 });
      }
      const entry = detailsMap.get(trxId)!;
      const pName = String(d.nama_produk_snapshot || "").toLowerCase();
      const qty = Number(d.jumlah || 1);
      if (pName.includes("poleng")) {
        entry.poleng += qty;
      } else if (pName.includes("batik")) {
        entry.batik += qty;
      }
    });

    // Map Kunjungan untuk memperkaya data transaksi (Nama Pengunjung, Kategori)
    const visitMap = new Map<string, any>();
    visits.forEach((v: any) => {
      if (v.visit_id) visitMap.set(v.visit_id, v);
    });

    // Map Pembayaran untuk mencatat metode transaksi (TUNAI vs QRIS BAYANNESIA vs QRIS BUMDES BAYAN)
    const paymentMap = new Map<string, string>();
    (fReport.pembayaran_items || []).forEach((p: any) => {
      if (p.transaction_id && p.metode_pembayaran) {
        paymentMap.set(p.transaction_id, p.metode_pembayaran);
      }
    });

    // Rekonsiliasi Pendapatan Bersih Berdasarkan Tarif Sewa Barang (t.total_harga)
    let netPendapatan = 0;
    let netTunai = 0;
    let netQrisBayannesia = 0;
    let netQrisBumdes = 0;
    let netQrisUmum = 0;
    let countLunas = 0;
    let totalKainPoleng = 0;
    let totalKainBatik = 0;

    transactions.forEach((t: any) => {
      const isLunas =
        t.status_pembayaran === "LUNAS" ||
        t.status_transaksi === "DISEWA" ||
        t.status_transaksi === "SELESAI";

      // Hitung unit kain
      const dFallback = detailsMap.get(t.transaction_id);
      const jmlPoleng =
        typeof t.jumlah_kain_poleng === "number" && t.jumlah_kain_poleng > 0
          ? t.jumlah_kain_poleng
          : (dFallback?.poleng || 0);
      const jmlBatik =
        typeof t.jumlah_kain_batik === "number" && t.jumlah_kain_batik > 0
          ? t.jumlah_kain_batik
          : (dFallback?.batik || 0);

      if (isLunas) {
        const harga = Number(t.total_harga || 0);
        netPendapatan += harga;
        countLunas++;
        totalKainPoleng += jmlPoleng;
        totalKainBatik += jmlBatik;

        const rawMetode = String(
          t.metode_pembayaran || paymentMap.get(t.transaction_id) || "TUNAI"
        ).toUpperCase().trim();

        if (rawMetode.includes("BAYANNESIA")) {
          netQrisBayannesia += harga;
        } else if (rawMetode.includes("BUMDES")) {
          netQrisBumdes += harga;
        } else if (rawMetode.includes("QRIS")) {
          // Jika QRIS umum, cek dominasi item sewa atau alokasikan sesuai busana adat
          if (jmlPoleng > 0 && jmlBatik === 0) {
            netQrisBayannesia += harga;
          } else if (jmlBatik > 0 && jmlPoleng === 0) {
            netQrisBumdes += harga;
          } else if (jmlPoleng > 0) {
            netQrisBayannesia += harga;
          } else if (jmlBatik > 0) {
            netQrisBumdes += harga;
          } else {
            // Default jika sewa pakaian adat sasak via QRIS (Kain Poleng Bayannesia)
            netQrisBayannesia += harga;
          }
        } else {
          netTunai += harga;
        }
      }
    });

    // Buat Workbook ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistem Digital BAYAN VISITOR";
    workbook.lastModifiedBy = user.nama || "Petugas Pengelola";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Palet Warna Budaya Bayan
    const BAYAN_HEADER_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1C2B21" }, // Hijau tua Bayan
    };
    const BAYAN_GOLD_FONT: Partial<ExcelJS.Font> = {
      name: "Arial",
      color: { argb: "FFD4AF37" }, // Emas Bayan
      bold: true,
    };
    const TABLE_HEADER_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E4233" },
    };
    const WHITE_BOLD_FONT: Partial<ExcelJS.Font> = {
      name: "Arial",
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 10,
    };
    const THIN_BORDER: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFD0D7DE" } },
      bottom: { style: "thin", color: { argb: "FFD0D7DE" } },
      left: { style: "thin", color: { argb: "FFD0D7DE" } },
      right: { style: "thin", color: { argb: "FFD0D7DE" } },
    };

    // ========================================================================
    // SHEET 1: RINGKASAN OPERASIONAL & KEUANGAN
    // ========================================================================
    const sheetSummary = workbook.addWorksheet("Ringkasan Operasional");
    sheetSummary.views = [{ showGridLines: true }];

    // Kop Dokumen Resmi
    sheetSummary.mergeCells("A1:G1");
    const titleCell = sheetSummary.getCell("A1");
    titleCell.value = "MASJID KUNO BAYAN - LAPORAN OPERASIONAL & STATISTIK KUNJUNGAN";
    titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFD4AF37" } };
    titleCell.fill = BAYAN_HEADER_FILL;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheetSummary.getRow(1).height = 32;

    sheetSummary.mergeCells("A2:G2");
    const subCell = sheetSummary.getCell("A2");
    subCell.value = `Periode: ${start_date || "Seluruh Waktu"} s/d ${end_date || "Hari Ini"} (Zona Waktu WITA, UTC+8) | Diekspor: ${new Date().toLocaleString("id-ID")}`;
    subCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FFFFFFFF" } };
    subCell.fill = BAYAN_HEADER_FILL;
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheetSummary.getRow(2).height = 20;

    // Spasi
    sheetSummary.addRow([]);

    // Bagian A: Ringkasan Kunjungan
    sheetSummary.addRow(["RINGKASAN KUNJUNGAN PENGUNJUNG"]).font = { bold: true, size: 11, color: { argb: "FF1C2B21" } };
    sheetSummary.addRow(["Metrik", "Nilai", "Keterangan"]);
    const sumVisitHRow = sheetSummary.lastRow!;
    sumVisitHRow.font = WHITE_BOLD_FONT;
    sumVisitHRow.eachCell((c) => { c.fill = TABLE_HEADER_FILL; c.border = THIN_BORDER; });

    const totalKunj = vReport.ringkasan?.total_kunjungan || visits.length;
    const totalPeng = vReport.ringkasan?.total_pengunjung || 0;
    const totalDew = vReport.ringkasan?.total_dewasa || 0;
    const totalAnak = vReport.ringkasan?.total_anak || 0;

    const visitMetrics = [
      ["Total Sesi Kunjungan (Tiket)", totalKunj, "Jumlah rombongan terdaftar"],
      ["Total Pengunjung Keseluruhan", totalPeng, "Rumus: Total Dewasa + Total Anak"],
      ["Pengunjung Dewasa", totalDew, "Kategori usia dewasa"],
      ["Pengunjung Anak-anak", totalAnak, "Kategori usia anak-anak"],
      ["Rata-rata Rombongan", vReport.ringkasan?.rata_rata_per_kunjungan || (totalKunj > 0 ? (totalPeng / totalKunj).toFixed(1) : 0), "Orang per sesi kunjungan"],
      ["Pengunjung Domestik", vReport.jenis_pengunjung?.DOMESTIK || 0, "Wisatawan Nusantara"],
      ["Pengunjung Mancanegara", vReport.jenis_pengunjung?.MANCANEGARA || 0, "Wisatawan Asing"],
    ];

    visitMetrics.forEach((m) => {
      const r = sheetSummary.addRow(m);
      r.getCell(1).border = THIN_BORDER;
      r.getCell(2).border = THIN_BORDER;
      r.getCell(2).alignment = { horizontal: "right" };
      r.getCell(3).border = THIN_BORDER;
    });

    // Spasi
    sheetSummary.addRow([]);

    // Bagian B: Ringkasan Keuangan Sewa Pakaian Adat
    sheetSummary.addRow(["RINGKASAN KEUANGAN PENYEWAAN PAKAIAN ADAT"]).font = { bold: true, size: 11, color: { argb: "FF1C2B21" } };
    sheetSummary.addRow(["Metrik", "Nominal / Jumlah", "Keterangan"]);
    const sumFinHRow = sheetSummary.lastRow!;
    sumFinHRow.font = WHITE_BOLD_FONT;
    sumFinHRow.eachCell((c) => { c.fill = TABLE_HEADER_FILL; c.border = THIN_BORDER; });

    const totPendapatan =
      countLunas > 0 ? netPendapatan : fReport.ringkasan?.total_pendapatan || 0;
    const totTunai =
      countLunas > 0 ? netTunai : fReport.ringkasan?.total_tunai || 0;
    const totLunas =
      countLunas > 0
        ? countLunas
        : fReport.ringkasan?.total_transaksi_sukses || 0;

    const finMetrics: Array<{ label: string; value: number | string; note: string; isCurrency?: boolean }> = [
      {
        label: "Total Unit Sewa Kain Poleng",
        value: `${totalKainPoleng} Unit`,
        note: "Total akumulasi busana adat Kain Poleng yang disewa",
        isCurrency: false,
      },
      {
        label: "Total Unit Sewa Kain Batik",
        value: `${totalKainBatik} Unit`,
        note: "Total akumulasi busana adat Kain Batik yang disewa",
        isCurrency: false,
      },
      {
        label: "Total Pendapatan Sewa Bersih (Lunas)",
        value: totPendapatan,
        note: "Total nominal tarif sewa resmi barang yang lunas (tidak termasuk uang lebih/kembalian)",
        isCurrency: true,
      },
      {
        label: "Pembayaran Tunai (Cash)",
        value: totTunai,
        note: "Penerimaan tunai resmi di loket kasir (hanya harga sewa barang)",
        isCurrency: true,
      },
      {
        label: "Payment QRIS BAYANNESIA (Kain Poleng)",
        value: netQrisBayannesia,
        note: "Penerimaan nontunai QRIS khusus sewa Kain Poleng (Bayannesia)",
        isCurrency: true,
      },
      {
        label: "Payment QRIS BUMDES BAYAN (Kain Batik)",
        value: netQrisBumdes,
        note: "Penerimaan nontunai QRIS khusus sewa Kain Batik (BUMDes Bayan)",
        isCurrency: true,
      },
    ];

    if (netQrisUmum > 0) {
      finMetrics.push({
        label: "Payment QRIS Gabungan / Lainnya",
        value: netQrisUmum,
        note: "Penerimaan nontunai QRIS transaksi kombinasi / QRIS umum",
        isCurrency: true,
      });
    }

    finMetrics.push({
      label: "Total Transaksi Lunas",
      value: totLunas,
      note: "Jumlah transaksi sewa berstatus LUNAS",
      isCurrency: false,
    });

    finMetrics.forEach((m) => {
      const r = sheetSummary.addRow([m.label, m.value, m.note]);
      r.getCell(1).border = THIN_BORDER;
      r.getCell(2).border = THIN_BORDER;
      if (m.isCurrency) {
        r.getCell(2).numFmt = "Rp #,##0";
      }
      r.getCell(2).alignment = { horizontal: "right" };
      r.getCell(3).border = THIN_BORDER;
    });

    sheetSummary.columns = [
      { width: 34 },
      { width: 22 },
      { width: 45 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    // ========================================================================
    // SHEET 2: DATA DETAIL KUNJUNGAN
    // ========================================================================
    const sheetVisits = workbook.addWorksheet("Data Detail Kunjungan");
    sheetVisits.views = [{ showGridLines: true }];

    sheetVisits.mergeCells("A1:I1");
    const vTitle = sheetVisits.getCell("A1");
    vTitle.value = "DAFTAR DETAIL KUNJUNGAN PENGUNJUNG MASJID KUNO BAYAN";
    vTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    vTitle.fill = BAYAN_HEADER_FILL;
    vTitle.alignment = { horizontal: "center", vertical: "middle" };
    sheetVisits.getRow(1).height = 28;

    const visitHeaders = [
      "No",
      "No. Tiket Kunjungan",
      "Tanggal (WITA)",
      "Nama Pengunjung",
      "Kategori",
      "Asal Daerah / Negara",
      "Dewasa",
      "Anak-anak",
      "Total Pengunjung",
    ];

    const vHRow = sheetVisits.addRow(visitHeaders);
    vHRow.font = WHITE_BOLD_FONT;
    vHRow.eachCell((c) => { c.fill = TABLE_HEADER_FILL; c.border = THIN_BORDER; c.alignment = { horizontal: "center" }; });
    sheetVisits.getRow(2).height = 22;

    visits.forEach((v: any, idx: number) => {
      const row = sheetVisits.addRow([
        idx + 1,
        v.visit_id,
        v.tanggal_kunjungan,
        v.nama_pengunjung || "-",
        v.jenis_pengunjung || "DOMESTIK",
        v.jenis_pengunjung === "DOMESTIK"
          ? `${v.kabupaten_kota || ""}, ${v.provinsi || ""}`.replace(/^, |, $/g, "")
          : v.negara || "-",
        Number(v.jumlah_dewasa || 1),
        Number(v.jumlah_anak || 0),
        Number(v.total_pengunjung || 1),
      ]);

      row.eachCell((c) => { c.border = THIN_BORDER; });
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "right" };
      row.getCell(8).alignment = { horizontal: "right" };
      row.getCell(9).alignment = { horizontal: "right" };
    });

    sheetVisits.columns = [
      { width: 6 },
      { width: 22 },
      { width: 16 },
      { width: 28 },
      { width: 16 },
      { width: 32 },
      { width: 10 },
      { width: 12 },
      { width: 16 },
    ];

    // ========================================================================
    // SHEET 3: DATA DETAIL TRANSAKSI & SEWA
    // ========================================================================
    const sheetFinance = workbook.addWorksheet("Data Detail Transaksi");
    sheetFinance.views = [{ showGridLines: true }];

    sheetFinance.mergeCells("A1:M1");
    const fTitle = sheetFinance.getCell("A1");
    fTitle.value = "DAFTAR DETAIL TRANSAKSI SEWA PAKAIAN ADAT & METODE PEMBAYARAN (TUNAI / QRIS BAYANNESIA / QRIS BUMDES)";
    fTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    fTitle.fill = BAYAN_HEADER_FILL;
    fTitle.alignment = { horizontal: "center", vertical: "middle" };
    sheetFinance.getRow(1).height = 28;

    const trxHeaders = [
      "No",
      "No. Transaksi",
      "No. Tiket Kunjungan",
      "Nama Pengunjung / Penyewa",
      "Kategori",
      "Tanggal Transaksi (WITA)",
      "Metode Pembayaran",
      "Sewa Kain Poleng (Unit)",
      "Sewa Kain Batik (Unit)",
      "Total Unit Sewa",
      "Nominal Sewa Bersih (Rp)",
      "Status Transaksi",
      "Status Pembayaran",
    ];

    const tHRow = sheetFinance.addRow(trxHeaders);
    tHRow.font = WHITE_BOLD_FONT;
    tHRow.eachCell((c) => { c.fill = TABLE_HEADER_FILL; c.border = THIN_BORDER; c.alignment = { horizontal: "center" }; });
    sheetFinance.getRow(2).height = 22;

    transactions.forEach((t: any, idx: number) => {
      const v = visitMap.get(t.visit_id);
      const namaPengunjung = t.nama_pengunjung || v?.nama_pengunjung || "-";
      const kategori = t.jenis_pengunjung || v?.jenis_pengunjung || "DOMESTIK";

      const dFallback = detailsMap.get(t.transaction_id);
      const jmlPoleng =
        typeof t.jumlah_kain_poleng === "number" && t.jumlah_kain_poleng > 0
          ? t.jumlah_kain_poleng
          : (dFallback?.poleng || 0);
      const jmlBatik =
        typeof t.jumlah_kain_batik === "number" && t.jumlah_kain_batik > 0
          ? t.jumlah_kain_batik
          : (dFallback?.batik || 0);

      const rawMetode = String(
        t.metode_pembayaran || paymentMap.get(t.transaction_id) || (t.status_pembayaran === "LUNAS" ? "TUNAI" : "-")
      ).toUpperCase().trim();

      let metode = rawMetode;
      if (rawMetode.includes("BAYANNESIA")) {
        metode = "Payment QRIS BAYANNESIA (Kain Poleng)";
      } else if (rawMetode.includes("BUMDES")) {
        metode = "Payment QRIS BUMDES BAYAN (Kain Batik)";
      } else if (rawMetode.includes("QRIS")) {
        // Otomatis tentukan secara presisi berdasarkan busana adat jika hanya tercatat string 'QRIS'
        if (jmlPoleng > 0 && jmlBatik === 0) {
          metode = "Payment QRIS BAYANNESIA (Kain Poleng)";
        } else if (jmlBatik > 0 && jmlPoleng === 0) {
          metode = "Payment QRIS BUMDES BAYAN (Kain Batik)";
        } else if (jmlPoleng > 0) {
          metode = "Payment QRIS BAYANNESIA (Kain Poleng)";
        } else if (jmlBatik > 0) {
          metode = "Payment QRIS BUMDES BAYAN (Kain Batik)";
        } else {
          metode = "Payment QRIS BAYANNESIA (Kain Poleng)";
        }
      } else if (rawMetode === "TUNAI" || t.status_pembayaran === "LUNAS") {
        metode = "TUNAI";
      } else {
        metode = "-";
      }

      const nominal = Number(t.total_harga || 0);

      const row = sheetFinance.addRow([
        idx + 1,
        t.transaction_id,
        t.visit_id,
        namaPengunjung,
        kategori,
        t.tanggal_transaksi,
        metode,
        jmlPoleng,
        jmlBatik,
        Number(t.total_barang || (jmlPoleng + jmlBatik) || 1),
        nominal,
        t.status_transaksi,
        t.status_pembayaran,
      ]);

      row.eachCell((c) => { c.border = THIN_BORDER; });
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "left" };
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(6).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(8).alignment = { horizontal: "right" };
      row.getCell(9).alignment = { horizontal: "right" };
      row.getCell(10).alignment = { horizontal: "right" };
      row.getCell(11).numFmt = "Rp #,##0";
      row.getCell(11).alignment = { horizontal: "right" };
      row.getCell(12).alignment = { horizontal: "center" };
      row.getCell(13).alignment = { horizontal: "center" };
    });

    sheetFinance.columns = [
      { width: 6 },  // No
      { width: 22 }, // No. Transaksi
      { width: 22 }, // No. Tiket
      { width: 26 }, // Nama Pengunjung / Penyewa
      { width: 16 }, // Kategori
      { width: 24 }, // Tanggal Transaksi
      { width: 38 }, // Metode Pembayaran (TUNAI / Payment QRIS BAYANNESIA / Payment QRIS BUMDES)
      { width: 22 }, // Sewa Kain Poleng (Unit)
      { width: 22 }, // Sewa Kain Batik (Unit)
      { width: 16 }, // Total Unit Sewa
      { width: 24 }, // Nominal Sewa Bersih (Rp)
      { width: 18 }, // Status Transaksi
      { width: 20 }, // Status Pembayaran
    ];

    // Tulis ke Buffer dan Kembalikan Respons Binary
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Laporan_Bayan_Visitor_${start_date || "Awal"}_sd_${end_date || "Kini"}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(`Gagal membuat file Excel: ${err.message}`, {
      status: 500,
    });
  }
}
