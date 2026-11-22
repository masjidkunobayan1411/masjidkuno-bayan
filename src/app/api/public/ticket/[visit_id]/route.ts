/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Pengambilan Data E-Tiket Berdasarkan visit_id
 * Endpoint: GET /api/public/ticket/[visit_id]
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { visit_id: string } }
) {
  try {
    const visitId = params.visit_id;

    if (!visitId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "ID Kunjungan (visit_id) wajib disertakan.",
          data: null,
          errors: ["Parameter visit_id kosong."],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const gasResponse = await callGasApi("visit:get", { visit_id: visitId });

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || `Data kunjungan [${visitId}] tidak ditemukan.`,
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const raw = gasResponse.data;
    const v = raw.visitor || {};
    const jenisPengunjung = raw.jenis_pengunjung || v.jenis_pengunjung || "DOMESTIK";
    const kabupatenKota = raw.kabupaten_kota || v.kabupaten_kota || "";
    const provinsi = raw.provinsi || v.provinsi || "";
    const negara = raw.negara || v.negara || (jenisPengunjung === "DOMESTIK" ? "INDONESIA" : "Mancanegara");

    let asalFormatted = raw.asal || "";
    if (!asalFormatted) {
      if (jenisPengunjung === "DOMESTIK") {
        asalFormatted = [kabupatenKota, provinsi || "Indonesia"].filter(Boolean).join(", ");
      } else {
        asalFormatted = negara;
      }
    }

    const normalizedData = {
      ...raw,
      visitor_id: raw.visitor_id || v.visitor_id || "",
      nama_pengunjung: raw.nama_pengunjung || v.nama_pengunjung || v.nama_lengkap || "Pengunjung Terdaftar",
      jenis_pengunjung: jenisPengunjung,
      negara,
      provinsi,
      kabupaten_kota: kabupatenKota,
      asal: asalFormatted,
      nomor_telepon: raw.nomor_telepon || v.nomor_telepon || "",
      asal_instansi: raw.asal_instansi || v.asal_instansi || "",
      visitor: {
        ...v,
        nama_pengunjung: raw.nama_pengunjung || v.nama_pengunjung || v.nama_lengkap || "Pengunjung Terdaftar",
        jenis_pengunjung: jenisPengunjung,
        negara,
        provinsi,
        kabupaten_kota: kabupatenKota,
        nomor_telepon: raw.nomor_telepon || v.nomor_telepon || "",
        asal_instansi: raw.asal_instansi || v.asal_instansi || "",
      },
    };

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data tiket berhasil ditemukan.",
      data: normalizedData,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat tiket: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
