/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Metrik Real-Time Dashboard Admin
 * Endpoint: GET /api/dashboard/stats
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Verifikasi Sesi Admin
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Akses ditolak. Sesi tidak aktif atau telah kedaluwarsa.",
          data: null,
          errors: ["Unauthorized"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // 2. Ambil Metrik Real-Time dari Backend GAS, Daftar Kunjungan, & Transaksi
    const [gasResponse, visitsResponse, trxResponse] = await Promise.all([
      callGasApi("report:dashboard").catch(() => ({ success: false, data: null })),
      callGasApi("visit:list", { limit: 1000 }).catch(() => ({ success: false, data: null })),
      callGasApi("transaction:list", { limit: 1000 }).catch(() => ({ success: false, data: null })),
    ]);

    // 3. Hitung Agregasi Metrik Secara Mandiri Berdasarkan Zona Waktu WITA (Asia/Makassar)
    const now = new Date();
    const witaFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayWita = witaFormatter.format(now); // "YYYY-MM-DD"
    const currentMonthWita = todayWita.substring(0, 7); // "YYYY-MM"

    // Susun daftar 7 hari terakhir dalam zona WITA
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      last7Days.push(witaFormatter.format(d));
    }

    const trendMap = new Map<
      string,
      { tanggal: string; kunjungan: number; pengunjung: number; dewasa: number; anak: number }
    >();
    last7Days.forEach((d) =>
      trendMap.set(d, { tanggal: d, kunjungan: 0, pengunjung: 0, dewasa: 0, anak: 0 })
    );

    let computedHariIni = { kunjungan: 0, pengunjung: 0, dewasa: 0, anak: 0, pendapatan: 0 };
    let computedBulanIni = { kunjungan: 0, pengunjung: 0, dewasa: 0, anak: 0, pendapatan: 0 };
    let computedDemografi = { domestik: 0, mancanegara: 0 };

    const visits =
      visitsResponse.success && visitsResponse.data?.items
        ? (visitsResponse.data.items as any[])
        : [];

    for (const v of visits) {
      const rawDate = v.tanggal_kunjungan || v.dibuat_pada;
      let vDate = "";
      if (rawDate) {
        const str = String(rawDate).trim();
        if (str.includes("T")) {
          vDate = str.split("T")[0];
        } else {
          const m = str.match(/^\d{4}-\d{2}-\d{2}/);
          if (m) {
            vDate = m[0];
          } else {
            try {
              const d = new Date(str);
              if (!isNaN(d.getTime())) {
                vDate = witaFormatter.format(d);
              }
            } catch {}
          }
        }
      }

      const total = Number(v.total_pengunjung || 0);
      const dewasa = Number(v.jumlah_dewasa || 0);
      const anak = Number(v.jumlah_anak || 0);

      // Agregasi Hari Ini
      if (vDate === todayWita) {
        computedHariIni.kunjungan++;
        computedHariIni.pengunjung += total;
        computedHariIni.dewasa += dewasa;
        computedHariIni.anak += anak;
      }

      // Agregasi Bulan Ini
      if (vDate.startsWith(currentMonthWita)) {
        computedBulanIni.kunjungan++;
        computedBulanIni.pengunjung += total;
        computedBulanIni.dewasa += dewasa;
        computedBulanIni.anak += anak;

        const tipe = String(v.jenis_pengunjung || "").toUpperCase();
        if (tipe === "MANCANEGARA") {
          computedDemografi.mancanegara += total;
        } else {
          computedDemografi.domestik += total;
        }
      }

      // Agregasi Tren 7 Hari Terakhir
      if (trendMap.has(vDate)) {
        const cur = trendMap.get(vDate)!;
        cur.kunjungan++;
        cur.pengunjung += total;
        cur.dewasa += dewasa;
        cur.anak += anak;
      }
    }

    // 4. Hitung Pendapatan Sewa Bersih & Unit Sedang Dipakai Berdasarkan Data Transaksi Riil
    // Menggunakan tarif resmi sewa barang (total_harga) agar uang lebih/kembalian tidak terhitung
    const transactions =
      trxResponse.success && trxResponse.data?.items
        ? (trxResponse.data.items as any[])
        : [];

    let computedPendapatanHariIni = 0;
    let computedPendapatanBulanIni = 0;
    let computedSewaAktifTrx = 0;
    let computedUnitDipakai = 0;

    for (const t of transactions) {
      if (t.status_transaksi === "DISEWA") {
        computedSewaAktifTrx++;
        const units =
          Number(t.total_barang || 0) ||
          (Number(t.jumlah_kain_poleng || 0) + Number(t.jumlah_kain_batik || 0)) ||
          1;
        computedUnitDipakai += units;
      }

      const isLunas =
        t.status_pembayaran === "LUNAS" ||
        t.status_transaksi === "DISEWA" ||
        t.status_transaksi === "SELESAI";

      if (isLunas) {
        const harga = Number(t.total_harga || 0);
        const rawDate = t.tanggal_transaksi || t.dibuat_pada;
        let tDate = "";
        if (rawDate) {
          const str = String(rawDate).trim();
          if (str.includes("T")) {
            tDate = str.split("T")[0];
          } else {
            const m = str.match(/^\d{4}-\d{2}-\d{2}/);
            if (m) {
              tDate = m[0];
            } else {
              try {
                const d = new Date(str);
                if (!isNaN(d.getTime())) {
                  tDate = witaFormatter.format(d);
                }
              } catch {}
            }
          }
        }

        if (tDate === todayWita) {
          computedPendapatanHariIni += harga;
        }
        if (tDate.startsWith(currentMonthWita)) {
          computedPendapatanBulanIni += harga;
        }
      }
    }

    const dashboardData =
      gasResponse.success && gasResponse.data ? (gasResponse.data as any) : null;

    // Gabungkan data GAS dengan data agregasi riil terhitung
    const finalHariIni = {
      kunjungan: Math.max(dashboardData?.hari_ini?.kunjungan || 0, computedHariIni.kunjungan),
      pengunjung: Math.max(dashboardData?.hari_ini?.pengunjung || 0, computedHariIni.pengunjung),
      dewasa: Math.max(dashboardData?.hari_ini?.dewasa || 0, computedHariIni.dewasa),
      anak: Math.max(dashboardData?.hari_ini?.anak || 0, computedHariIni.anak),
      pendapatan:
        computedPendapatanHariIni > 0
          ? computedPendapatanHariIni
          : dashboardData?.hari_ini?.pendapatan || 0,
    };

    const finalBulanIni = {
      kunjungan: Math.max(dashboardData?.bulan_ini_data?.kunjungan || 0, computedBulanIni.kunjungan),
      pengunjung: Math.max(
        dashboardData?.bulan_ini_data?.pengunjung || 0,
        computedBulanIni.pengunjung
      ),
      dewasa: Math.max(dashboardData?.bulan_ini_data?.dewasa || 0, computedBulanIni.dewasa),
      anak: Math.max(dashboardData?.bulan_ini_data?.anak || 0, computedBulanIni.anak),
      pendapatan:
        computedPendapatanBulanIni > 0
          ? computedPendapatanBulanIni
          : dashboardData?.bulan_ini_data?.pendapatan || 0,
    };

    const finalDemografi = {
      domestik: Math.max(
        dashboardData?.demografi_bulan_ini?.domestik || 0,
        computedDemografi.domestik
      ),
      mancanegara: Math.max(
        dashboardData?.demografi_bulan_ini?.mancanegara || 0,
        computedDemografi.mancanegara
      ),
    };

    const gasTrendSum = (dashboardData?.grafik_tren_7_hari || []).reduce(
      (acc: number, item: any) => acc + (Number(item.pengunjung) || 0),
      0
    );
    const finalTrend =
      gasTrendSum > 0 ? dashboardData.grafik_tren_7_hari : Array.from(trendMap.values());

    const finalData = {
      waktu_server: dashboardData?.waktu_server || new Date().toISOString(),
      tanggal_hari_ini: todayWita,
      bulan_ini: currentMonthWita,
      hari_ini: finalHariIni,
      bulan_ini_data: finalBulanIni,
      sewa_aktif: Math.max(dashboardData?.sewa_aktif || 0, computedSewaAktifTrx),
      unit_sedang_dipakai: Math.max(
        Number(dashboardData?.unit_sedang_dipakai || dashboardData?.inventaris?.disewa || 0),
        computedUnitDipakai
      ),
      demografi_bulan_ini: finalDemografi,
      inventaris: dashboardData?.inventaris || {
        total: 0,
        tersedia: 0,
        disewa: 0,
        ditahan: 0,
        perawatan: 0,
        rusak: 0,
        hilang: 0,
      },
      grafik_tren_7_hari: finalTrend,
      aktivitas_terkini: dashboardData?.aktivitas_terkini || [],
    };

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data metrik dashboard berhasil dimuat.",
      data: finalData,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat metrik: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
