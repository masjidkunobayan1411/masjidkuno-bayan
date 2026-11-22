/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Registrasi Pengunjung Publik Mandiri
 * Endpoint: POST /api/public/register
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      nama_pengunjung,
      jenis_pengunjung,
      negara,
      provinsi,
      kabupaten_kota,
      nomor_telepon,
      asal_instansi,
      jumlah_dewasa,
      jumlah_anak,
      tujuan_kunjungan,
      bahasa,
      persetujuan_data,
    } = body;

    // 1. Validasi Input Dasar
    const errors: string[] = [];

    if (!nama_pengunjung || String(nama_pengunjung).trim().length < 2) {
      errors.push("Nama pengunjung wajib diisi minimal 2 karakter.");
    }

    const jenis = String(jenis_pengunjung || "").toUpperCase();
    if (jenis !== "DOMESTIK" && jenis !== "MANCANEGARA") {
      errors.push("Jenis pengunjung harus 'DOMESTIK' atau 'MANCANEGARA'.");
    }

    if (jenis === "DOMESTIK") {
      if (!provinsi || String(provinsi).trim() === "") {
        errors.push("Provinsi wajib dipilih untuk pengunjung domestik.");
      }
      if (!kabupaten_kota || String(kabupaten_kota).trim() === "") {
        errors.push("Kabupaten/Kota wajib diisi untuk pengunjung domestik.");
      }
    } else if (jenis === "MANCANEGARA") {
      if (!negara || String(negara).trim() === "" || String(negara).trim() === "-") {
        errors.push("Negara asal wajib diisi untuk pengunjung mancanegara.");
      }
    }

    const dewasa = Number(jumlah_dewasa);
    const anak = Number(jumlah_anak || 0);

    if (isNaN(dewasa) || dewasa < 0) {
      errors.push("Jumlah pengunjung dewasa harus berupa angka positif.");
    }
    if (isNaN(anak) || anak < 0) {
      errors.push("Jumlah pengunjung anak harus berupa angka positif.");
    }
    if (dewasa + anak < 1) {
      errors.push("Total pengunjung (dewasa + anak) minimal 1 orang.");
    }

    if (!tujuan_kunjungan || String(tujuan_kunjungan).trim() === "") {
      errors.push("Tujuan kunjungan wajib dipilih.");
    }

    if (!persetujuan_data) {
      errors.push("Persetujuan ketentuan data dan tata tertib wajib dicentang.");
    }

    // Validasi Nomor Telepon / WhatsApp (Opsional, jika diisi harus berformat valid)
    const cleanPhone = nomor_telepon ? String(nomor_telepon).trim() : "";
    if (cleanPhone && cleanPhone !== "-") {
      const numericOnly = cleanPhone.replace(/[\s\-\(\)]/g, "");
      if (!/^\+?[0-9]{8,16}$/.test(numericOnly)) {
        errors.push("Format nomor WhatsApp / HP tidak valid (contoh: 08123456789).");
      }
    }

    if (errors.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Formulir pendaftaran belum lengkap atau tidak valid.",
          data: null,
          errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 2. Susun Payload Kanonikal untuk Backend Google Apps Script
    const payload = {
      nama_pengunjung: String(nama_pengunjung).trim(),
      jenis_pengunjung: jenis,
      negara: jenis === "DOMESTIK" ? "Indonesia" : String(negara).trim(),
      provinsi: jenis === "DOMESTIK" ? String(provinsi).trim() : "-",
      kabupaten_kota: jenis === "DOMESTIK" ? String(kabupaten_kota).trim() : "-",
      nomor_telepon: cleanPhone || "-",
      asal_instansi: String(asal_instansi || "Umum / Pribadi").trim(),
      jumlah_dewasa: dewasa,
      jumlah_anak: anak,
      total_pengunjung: dewasa + anak,
      tujuan_kunjungan: String(tujuan_kunjungan).trim(),
      bahasa: String(bahasa || "ID").toUpperCase().trim(),
      persetujuan_data: true,
    };

    // 3. Teruskan Permintaan ke GAS melalui Jembatan HMAC Aman
    const gasResponse = await callGasApi("visit:register", payload);

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal mencatat registrasi kunjungan ke database.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Registrasi kunjungan berhasil tercatat.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan internal pada server: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
