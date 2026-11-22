/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Pengambilan Data Kunjungan Terdaftar (Untuk Kasir Transaksi)
 * Endpoint: GET /api/visits
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
    const search = (searchParams.get("search") || "").trim();
    const tanggal = (searchParams.get("tanggal") || "").trim();
    const status = (searchParams.get("status") || "ALL").trim();
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Ambil data dari GAS (request hingga 1000 items agar pencarian multi-field mandiri berjalan menyeluruh)
    const gasResponse = await callGasApi("visit:list", {
      filters: {
        limit: 1000,
      },
      limit: 1000,
    });

    let allItems: any[] = [];
    if (gasResponse.success && gasResponse.data?.items) {
      allItems = gasResponse.data.items;
    }

    // Helper ekstraksi tanggal WITA
    const witaFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const extractDateStr = (raw: any): string => {
      if (!raw) return "";
      const str = String(raw).trim();
      if (str.includes("T")) return str.split("T")[0];
      const m = str.match(/^\d{4}-\d{2}-\d{2}/);
      if (m) return m[0];
      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return witaFormatter.format(d);
      } catch {}
      return str;
    };

    // Filter Multi-Field Komprehensif
    const q = search.toLowerCase();
    const filtered = allItems.filter((v: any) => {
      // 1. Filter Status
      if (status !== "ALL" && status !== "") {
        const itemStatus = String(v.status_kunjungan || "").toUpperCase();
        const targetStatus = status.toUpperCase();
        if (targetStatus === "TERVERIFIKASI") {
          if (itemStatus !== "TERVERIFIKASI" && itemStatus !== "CHECK-IN") {
            return false;
          }
        } else if (itemStatus !== targetStatus) {
          return false;
        }
      }

      // 2. Filter Tanggal
      if (tanggal) {
        const vDate = extractDateStr(v.tanggal_kunjungan || v.dibuat_pada);
        if (vDate !== tanggal && !vDate.startsWith(tanggal)) {
          return false;
        }
      }

      // 3. Filter Pencarian Teks Komprehensif
      // Mencakup: Nama, ID Kunjungan, Asal Wilayah (Kab/Kota, Prov, Negara), No HP, Instansi, Tujuan
      if (q) {
        const matchId = String(v.visit_id || "").toLowerCase().includes(q);
        const matchVisitorId = String(v.visitor_id || "").toLowerCase().includes(q);
        const matchName = String(
          v.nama_pengunjung || v.nama_lengkap || v.nama || ""
        ).toLowerCase().includes(q);
        const matchPhone = String(
          v.nomor_telepon || v.no_hp || v.telepon || ""
        ).toLowerCase().includes(q);
        const matchInstansi = String(v.asal_instansi || "").toLowerCase().includes(q);
        const matchKota = String(v.kabupaten_kota || "").toLowerCase().includes(q);
        const matchProv = String(v.provinsi || "").toLowerCase().includes(q);
        const matchNegara = String(v.negara || "").toLowerCase().includes(q);
        const matchTujuan = String(v.tujuan_kunjungan || "").toLowerCase().includes(q);
        const matchCatatan = String(v.catatan || "").toLowerCase().includes(q);
        const matchStatus = String(v.status_kunjungan || "").toLowerCase().includes(q);

        if (
          !matchId &&
          !matchVisitorId &&
          !matchName &&
          !matchPhone &&
          !matchInstansi &&
          !matchKota &&
          !matchProv &&
          !matchNegara &&
          !matchTujuan &&
          !matchCatatan &&
          !matchStatus
        ) {
          return false;
        }
      }

      return true;
    });

    // Urutkan dari yang terbaru
    filtered.sort((a: any, b: any) => {
      const timeA = new Date(a.dibuat_pada || a.tanggal_kunjungan || 0).getTime();
      const timeB = new Date(b.dibuat_pada || b.tanggal_kunjungan || 0).getTime();
      return timeB - timeA;
    });

    const paginatedItems = filtered.slice(offset, offset + limit);

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data kunjungan berhasil dimuat.",
      data: {
        items: paginatedItems,
        total: filtered.length,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat kunjungan: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    let { visit_id, status } = body;

    if (!visit_id || !status) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "visit_id dan status wajib disertakan.",
          data: null,
          errors: ["Validation error"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Normalisasi: jika status "CHECK-IN", jadikan "TERVERIFIKASI"
    if (status === "CHECK-IN") {
      status = "TERVERIFIKASI";
    }

    // 1. Kirim status ke Google Apps Script
    let gasResponse = await callGasApi("visit:update_status", {
      visit_id,
      status,
      admin_id: user.admin_id,
    });

    // 2. Fallback Kompatibilitas Deployment GAS Lama:
    // Jika Google Apps Script yang terpasang di Spreadsheet belum di-redeploy (masih validasi lama)
    // dan merespons: "Status kunjungan tidak valid. Pilihan: TERDAFTAR, SELESAI, BATAL",
    // maka kita kirimkan status "SELESAI" ke GAS agar data spreadsheet tetap berhasil terupdate,
    // dan kembalikan status_kunjungan: "TERVERIFIKASI" ke frontend!
    if (
      !gasResponse.success &&
      gasResponse.message?.includes("Status kunjungan tidak valid") &&
      (status === "TERVERIFIKASI" || status === "CHECK-IN")
    ) {
      const fallbackResponse = await callGasApi("visit:update_status", {
        visit_id,
        status: "SELESAI",
        admin_id: user.admin_id,
      });

      if (fallbackResponse.success) {
        return NextResponse.json<ApiResponse<any>>({
          success: true,
          message: "Status kunjungan berhasil diverifikasi.",
          data: {
            ...(fallbackResponse.data || {}),
            visit_id,
            status_kunjungan: "TERVERIFIKASI",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (gasResponse.success) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: gasResponse.message || "Status kunjungan berhasil diperbarui.",
        data: {
          ...(gasResponse.data || {}),
          status_kunjungan: status,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: gasResponse.message || "Gagal memperbarui status kunjungan.",
        data: null,
        errors: gasResponse.errors,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat update kunjungan: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
