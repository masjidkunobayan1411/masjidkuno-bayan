/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Analisis Laporan Statistik & Keuangan
 * Endpoint: GET /api/reports/analytics
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Sesi tidak aktif atau telah kedaluwarsa.",
          data: null,
          errors: ["Unauthorized"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const start_date = searchParams.get("start_date") || "";
    const end_date = searchParams.get("end_date") || "";

    const filters = {
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      all: !start_date && !end_date,
    };

    let visitsData: any = null;
    let financialData: any = null;
    const visitProfileMap = new Map<string, { nama_pengunjung: string; jenis_pengunjung: string }>();

    if (type === "visits" || type === "all") {
      const [visitRes, visitListRes] = await Promise.all([
        callGasApi("report:visits", {
          filters,
          start_date: filters.start_date,
          end_date: filters.end_date,
          all: filters.all,
        }),
        callGasApi("visit:list", { filters, limit: 1000 }).catch(() => ({
          success: false,
          data: null,
        })),
      ]);

      if (visitRes.success) visitsData = visitRes.data;

      // Rekonsiliasi Metrik Kunjungan Secara Presisi Berdasarkan Rentang Tanggal Filter
      if (visitListRes.success && Array.isArray(visitListRes.data?.items)) {
        const allVisits = visitListRes.data.items as any[];

        allVisits.forEach((v: any) => {
          if (v.visit_id) {
            visitProfileMap.set(v.visit_id, {
              nama_pengunjung: v.nama_pengunjung || "-",
              jenis_pengunjung: v.jenis_pengunjung || "DOMESTIK",
            });
          }
        });

        const filteredVisits = allVisits.filter((v: any) => {
          const tgl = String(v.tanggal_kunjungan || "").trim().split("T")[0];
          if (start_date && tgl < start_date) return false;
          if (end_date && tgl > end_date) return false;
          return true;
        });

        let totalPengunjung = 0;
        let totalDewasa = 0;
        let totalAnak = 0;
        const harianMap = new Map<
          string,
          { tanggal: string; kunjungan: number; pengunjung: number; dewasa: number; anak: number }
        >();
        const tipeMap = { DOMESTIK: 0, MANCANEGARA: 0 };
        const provMap = new Map<string, number>();
        const kabMap = new Map<string, number>();
        const negMap = new Map<string, number>();
        const tujMap = new Map<string, number>();

        filteredVisits.forEach((v) => {
          const tgl = String(v.tanggal_kunjungan || "").trim().split("T")[0];
          const total = Number(v.total_pengunjung || 0);
          const dewasa = Number(v.jumlah_dewasa || 0);
          const anak = Number(v.jumlah_anak || 0);

          totalPengunjung += total;
          totalDewasa += dewasa;
          totalAnak += anak;

          if (tgl) {
            if (!harianMap.has(tgl)) {
              harianMap.set(tgl, { tanggal: tgl, kunjungan: 0, pengunjung: 0, dewasa: 0, anak: 0 });
            }
            const h = harianMap.get(tgl)!;
            h.kunjungan++;
            h.pengunjung += total;
            h.dewasa += dewasa;
            h.anak += anak;
          }

          const jenis = String(v.jenis_pengunjung || "DOMESTIK").toUpperCase().trim();
          if (jenis === "MANCANEGARA") {
            tipeMap.MANCANEGARA += total;
            const neg = v.negara || "Lainnya";
            negMap.set(neg, (negMap.get(neg) || 0) + total);
          } else {
            tipeMap.DOMESTIK += total;
            const prov = v.provinsi || "Lainnya";
            provMap.set(prov, (provMap.get(prov) || 0) + total);
            const kab = v.kabupaten_kota || "Lainnya";
            kabMap.set(kab, (kabMap.get(kab) || 0) + total);
          }

          const tuj = v.tujuan_kunjungan || "Lainnya";
          tujMap.set(tuj, (tujMap.get(tuj) || 0) + total);
        });

        const toTopList = (map: Map<string, number>, max = 10) =>
          Array.from(map.entries())
            .map(([label, total]) => ({ label, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, max);

        const deretHarian = Array.from(harianMap.values()).sort((a, b) =>
          a.tanggal.localeCompare(b.tanggal)
        );

        if (!visitsData) visitsData = {};
        visitsData.periode = { start_date, end_date };
        visitsData.ringkasan = {
          total_kunjungan: filteredVisits.length,
          total_pengunjung: totalPengunjung,
          total_dewasa: totalDewasa,
          total_anak: totalAnak,
          rata_rata_per_kunjungan:
            filteredVisits.length > 0 ? (totalPengunjung / filteredVisits.length).toFixed(1) : 0,
        };
        visitsData.jenis_pengunjung = tipeMap;
        visitsData.top_provinsi = toTopList(provMap, 10);
        visitsData.top_kabupaten_kota = toTopList(kabMap, 10);
        visitsData.top_negara_mancanegara = toTopList(negMap, 10);
        visitsData.tujuan_kunjungan = toTopList(tujMap, 10);
        visitsData.deret_harian = deretHarian;
      } else if (visitsData && Array.isArray(visitsData.deret_harian) && (start_date || end_date)) {
        // Fallback filter deret harian
        visitsData.deret_harian = visitsData.deret_harian.filter((d: any) => {
          const tgl = String(d.tanggal || "").split("T")[0];
          if (start_date && tgl < start_date) return false;
          if (end_date && tgl > end_date) return false;
          return true;
        });

        let sumKunjungan = 0;
        let sumPengunjung = 0;
        let sumDewasa = 0;
        let sumAnak = 0;
        visitsData.deret_harian.forEach((d: any) => {
          sumKunjungan += Number(d.kunjungan || 0);
          sumPengunjung += Number(d.pengunjung || 0);
          sumDewasa += Number(d.dewasa || 0);
          sumAnak += Number(d.anak || 0);
        });

        if (!visitsData.ringkasan) visitsData.ringkasan = {};
        visitsData.ringkasan.total_kunjungan = sumKunjungan;
        visitsData.ringkasan.total_pengunjung = sumPengunjung;
        visitsData.ringkasan.total_dewasa = sumDewasa;
        visitsData.ringkasan.total_anak = sumAnak;
        visitsData.ringkasan.rata_rata_per_kunjungan =
          sumKunjungan > 0 ? (sumPengunjung / sumKunjungan).toFixed(1) : 0;
      }
    }

    if (type === "financial" || type === "all") {
      const [finRes, trxRes] = await Promise.all([
        callGasApi("report:financial", {
          filters,
          start_date: filters.start_date,
          end_date: filters.end_date,
          all: filters.all,
        }),
        callGasApi("transaction:list", { filters, limit: 1000 }).catch(() => ({
          success: false,
          data: null,
        })),
      ]);

      if (finRes.success) financialData = finRes.data;

      // Rekonsiliasi Pendapatan Bersih Berdasarkan Nominal Sewa Barang (total_harga transaksi)
      // Mencegah uang lebih/kembalian tunai terhitung ke dalam pendapatan sewa
      if (trxRes.success && trxRes.data?.items) {
        const transactions = trxRes.data.items as any[];
        let netPendapatan = 0;
        let netTunai = 0;
        let netQris = 0;
        let netQrisBayannesia = 0;
        let netQrisBumdes = 0;
        let countLunas = 0;

        const paymentMap = new Map<string, string>();
        (financialData?.pembayaran_items || []).forEach((p: any) => {
          if (p.transaction_id && p.metode_pembayaran) {
            paymentMap.set(p.transaction_id, p.metode_pembayaran);
          }
        });

        const omsetMap = new Map<
          string,
          { tanggal: string; total: number; tunai: number; qris: number }
        >();

        const transaksiItems: any[] = [];

        transactions.forEach((t) => {
          // Filter rentang tanggal secara presisi
          const tgl = String(t.tanggal_transaksi || "").trim().split("T")[0];
          if (start_date && tgl < start_date) return;
          if (end_date && tgl > end_date) return;

          const harga = Number(t.total_harga || 0);
          const rawMetode = String(
            t.metode_pembayaran || paymentMap.get(t.transaction_id) || (t.status_pembayaran === "LUNAS" ? "TUNAI" : "-")
          ).trim();
          const upperMetode = rawMetode.toUpperCase();

          const jmlPoleng = Number(t.jumlah_kain_poleng || 0);
          const jmlBatik = Number(t.jumlah_kain_batik || 0);

          let metodeFormatted = rawMetode;
          if (upperMetode.includes("BAYANNESIA")) {
            metodeFormatted = "Payment QRIS BAYANNESIA (Kain Poleng)";
          } else if (upperMetode.includes("BUMDES")) {
            metodeFormatted = "Payment QRIS BUMDES BAYAN (Kain Batik)";
          } else if (upperMetode.includes("QRIS")) {
            if (jmlPoleng > 0 && jmlBatik === 0) {
              metodeFormatted = "Payment QRIS BAYANNESIA (Kain Poleng)";
            } else if (jmlBatik > 0 && jmlPoleng === 0) {
              metodeFormatted = "Payment QRIS BUMDES BAYAN (Kain Batik)";
            } else if (jmlPoleng > 0) {
              metodeFormatted = "Payment QRIS BAYANNESIA (Kain Poleng)";
            } else if (jmlBatik > 0) {
              metodeFormatted = "Payment QRIS BUMDES BAYAN (Kain Batik)";
            } else {
              metodeFormatted = "Payment QRIS BAYANNESIA (Kain Poleng)";
            }
          } else if (upperMetode === "TUNAI" || t.status_pembayaran === "LUNAS") {
            metodeFormatted = "TUNAI";
          } else {
            metodeFormatted = rawMetode || "-";
          }

          const vProfile = visitProfileMap.get(t.visit_id);
          const namaPengunjung =
            t.nama_pengunjung && t.nama_pengunjung !== "-"
              ? t.nama_pengunjung
              : (vProfile?.nama_pengunjung || "-");

          transaksiItems.push({
            transaction_id: t.transaction_id,
            visit_id: t.visit_id,
            nama_pengunjung: namaPengunjung,
            tanggal_transaksi: t.tanggal_transaksi,
            metode_pembayaran: metodeFormatted,
            nominal_sewa: harga,
            total_harga: harga,
            status_pembayaran: t.status_pembayaran || "BELUM_DIBAYAR",
            status_transaksi: t.status_transaksi || "DISEWA",
            total_barang: Number(t.total_barang || (jmlPoleng + jmlBatik) || 1),
            nama_petugas: t.nama_petugas || "Petugas Kasir",
            dibuat_pada: t.dibuat_pada || t.tanggal_transaksi,
          });

          if (
            t.status_pembayaran === "LUNAS" ||
            t.status_transaksi === "DISEWA" ||
            t.status_transaksi === "SELESAI"
          ) {
            netPendapatan += harga;
            countLunas++;

            const isQris =
              metodeFormatted.includes("QRIS") ||
              metodeFormatted.includes("BAYANNESIA") ||
              metodeFormatted.includes("BUMDES");

            if (isQris) {
              netQris += harga;
              if (metodeFormatted.includes("BUMDES")) {
                netQrisBumdes += harga;
              } else {
                netQrisBayannesia += harga;
              }
            } else {
              netTunai += harga;
            }

            if (tgl) {
              if (!omsetMap.has(tgl)) {
                omsetMap.set(tgl, { tanggal: tgl, total: 0, tunai: 0, qris: 0 });
              }
              const omset = omsetMap.get(tgl)!;
              omset.total += harga;
              if (isQris) {
                omset.qris += harga;
              } else {
                omset.tunai += harga;
              }
            }
          }
        });

        // Urutkan transaksi dari yang paling baru
        transaksiItems.sort((a, b) => {
          const timeA = new Date(a.dibuat_pada || a.tanggal_transaksi).getTime() || 0;
          const timeB = new Date(b.dibuat_pada || b.tanggal_transaksi).getTime() || 0;
          return timeB - timeA;
        });

        if (!financialData) financialData = {};
        if (!financialData.ringkasan) financialData.ringkasan = {};
        financialData.periode = { start_date, end_date };
        financialData.ringkasan.total_pendapatan = netPendapatan;
        financialData.ringkasan.total_tunai = netTunai;
        financialData.ringkasan.total_qris = netQris;
        financialData.ringkasan.total_qris_bayannesia = netQrisBayannesia;
        financialData.ringkasan.total_qris_bumdes = netQrisBumdes;
        financialData.ringkasan.total_transaksi_sukses = countLunas;
        financialData.omset_harian = Array.from(omsetMap.values()).sort((a, b) =>
          a.tanggal.localeCompare(b.tanggal)
        );
        financialData.transaksi_items = transaksiItems;
      }
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data laporan analitik berhasil dimuat.",
      data: {
        visits: visitsData,
        financial: financialData,
        transactions: financialData?.transaksi_items || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat laporan: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
