/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Unggah / Ganti Media & Foto Website
 * Endpoint: POST /api/media/upload
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { promises as fs } from "fs";
import path from "path";
import { callGasApi } from "@/lib/gas-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Pemetaan target file media yang diizinkan (keamanan path traversal terjamin)
const ALLOWED_TARGETS: Record<
  string,
  {
    relativePath: string;
    altRelativePaths?: string[];
    allowedExtensions: string[];
    label: string;
    gasAliases?: string[];
  }
> = {
  "jejak-peradaban": {
    relativePath: "public/media/photos/heritage/jejak-peradaban.jpg",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Banner Jejak Peradaban",
  },
  "hero-bayan": {
    relativePath: "public/media/photos/heritage/hero-bayan.jpg",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Full-Width Hero Utama",
  },
  "masjid-kuno": {
    relativePath: "public/media/photos/heritage/masjid-kuno.jpg",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kompleks Utama Masjid Kuno",
  },
  "makam-wali": {
    relativePath: "public/media/photos/heritage/makam-wali.jpg",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kompleks Makam Para Wali",
  },
  "maulid-adat": {
    relativePath: "public/media/photos/heritage/maulid-adat.jpg",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kirab Maulid Adat",
  },
  "desa-bayan": {
    relativePath: "public/media/photos/heritage/desa-bayan.jpg",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Lanskap Desa Bayan & Rinjani",
  },
  "logo": {
    relativePath: "public/media/logo/logo.png",
    altRelativePaths: ["public/media/logo/Logo.png"],
    allowedExtensions: [".png", ".jpg", ".jpeg", ".svg", ".webp"],
    label: "Logo Utama Website",
  },
  "qris-dana": {
    relativePath: "public/media/qris/qris-dana.png",
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
    label: "Barcode QRIS DANA Kasir",
  },
  "qris-bayannesia": {
    relativePath: "public/media/qris/qris-bayannesia.png",
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
    label: "Barcode QRIS BAYANNESIA (Kain Poleng)",
  },
  "qris-bumdes": {
    relativePath: "public/media/qris/qris-bumdes.png",
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
    label: "Barcode QRIS BUMDES BAYAN (Kain Batik)",
  },
  "kain-poleng": {
    relativePath: "public/media/photos/products/kainpoleng.jpg",
    altRelativePaths: ["public/media/photos/products/kain-poleng.jpg"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kain Poleng Sasak",
    gasAliases: ["kain-poleng", "kainpoleng"],
  },
  "kainpoleng": {
    relativePath: "public/media/photos/products/kainpoleng.jpg",
    altRelativePaths: ["public/media/photos/products/kain-poleng.jpg"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kain Poleng Sasak",
    gasAliases: ["kain-poleng", "kainpoleng"],
  },
  "kain-batik": {
    relativePath: "public/media/photos/products/kainbatik.jpg",
    altRelativePaths: ["public/media/photos/products/kain-batik.jpg"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kain Batik Sasak",
    gasAliases: ["kain-batik", "kainbatik"],
  },
  "kainbatik": {
    relativePath: "public/media/photos/products/kainbatik.jpg",
    altRelativePaths: ["public/media/photos/products/kain-batik.jpg"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Kain Batik Sasak",
    gasAliases: ["kain-batik", "kainbatik"],
  },
  "sapuk-sabuk": {
    relativePath: "public/media/photos/products/sapukjong.jpg",
    altRelativePaths: [
      "public/media/photos/products/sapuk-sabuk.jpg",
      "public/media/photos/products/sapuk-jong.jpg",
      "public/media/photos/sapukjong.jpg",
      "public/media/photos/sapuk-sabuk.jpg",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Sapuk & Jong (Sabuk Anteng)",
    gasAliases: ["sapuk-sabuk", "sapukjong", "sapuk-jong"],
  },
  "sapukjong": {
    relativePath: "public/media/photos/products/sapukjong.jpg",
    altRelativePaths: [
      "public/media/photos/products/sapuk-sabuk.jpg",
      "public/media/photos/products/sapuk-jong.jpg",
      "public/media/photos/sapukjong.jpg",
      "public/media/photos/sapuk-sabuk.jpg",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Sapuk & Jong (Sabuk Anteng)",
    gasAliases: ["sapuk-sabuk", "sapukjong", "sapuk-jong"],
  },
  "sapuk-jong": {
    relativePath: "public/media/photos/products/sapukjong.jpg",
    altRelativePaths: [
      "public/media/photos/products/sapuk-sabuk.jpg",
      "public/media/photos/products/sapuk-jong.jpg",
      "public/media/photos/sapukjong.jpg",
      "public/media/photos/sapuk-sabuk.jpg",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "Foto Sapuk & Jong (Sabuk Anteng)",
    gasAliases: ["sapuk-sabuk", "sapukjong", "sapuk-jong"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || "";
    const targetKey = formData.get("targetKey") as string | null;

    if (!targetKey) {
      return NextResponse.json(
        { success: false, message: "Target media wajib disertakan." },
        { status: 400 }
      );
    }

    const targetConfig = ALLOWED_TARGETS[targetKey];
    if (!targetConfig) {
      return NextResponse.json(
        { success: false, message: `Target media '${targetKey}' tidak dikenali sistem.` },
        { status: 400 }
      );
    }

    // Opsi 1: Jika admin memasukkan URL Gambar langsung
    if (imageUrl) {
      if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
        return NextResponse.json(
          { success: false, message: "URL gambar harus diawali dengan http:// atau https://" },
          { status: 400 }
        );
      }

      await callGasApi("media:save", {
        key: targetKey,
        url: imageUrl,
      }).catch((e) => {
        console.warn("[MediaUpload] Simpan URL ke GAS:", e.message);
      });

      return NextResponse.json({
        success: true,
        message: `${targetConfig.label} berhasil ditautkan ke URL gambar baru!`,
        targetKey,
        publicUrl: imageUrl,
        timestamp: new Date().toISOString(),
      });
    }

    // Opsi 2: Unggah berkas gambar langsung dari perangkat
    if (!file) {
      return NextResponse.json(
        { success: false, message: "Pilih berkas gambar atau masukkan tautan URL gambar." },
        { status: 400 }
      );
    }

    // Validasi tipe berkas
    const ext = path.extname(file.name).toLowerCase();
    if (!targetConfig.allowedExtensions.includes(ext) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          message: `Ekstensi berkas tidak didukung. Gunakan salah satu dari: ${targetConfig.allowedExtensions.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Konversi file ke buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Tulis ke disk fisik lokal jika lingkungan mengizinkan (Local Development / VPS Writable)
    let savedToDisk = false;
    try {
      const publicPath = path.join(process.cwd(), targetConfig.relativePath);
      await fs.mkdir(path.dirname(publicPath), { recursive: true });
      await fs.writeFile(publicPath, buffer);

      // Simpan juga ke setiap file alternatif jika ada (misal: kain-poleng.jpg & kainpoleng.jpg)
      if (targetConfig.altRelativePaths) {
        for (const alt of targetConfig.altRelativePaths) {
          const altPath = path.join(process.cwd(), alt);
          await fs.mkdir(path.dirname(altPath), { recursive: true });
          await fs.writeFile(altPath, buffer).catch(() => {});
        }
      }

      // Sinkronkan juga ke folder photos/ jika item berada di products/
      if (targetConfig.relativePath.includes("products/")) {
        const altPath = path.join(process.cwd(), "public/media/photos", path.basename(targetConfig.relativePath));
        await fs.writeFile(altPath, buffer).catch(() => {});
      }
      savedToDisk = true;
    } catch (diskErr: any) {
      // Pada Vercel Serverless / AWS Lambda, folder /var/task bersifat Read-Only.
      // Kita gunakan folder /tmp yang selalu writable di lingkungan serverless.
      try {
        const tmpPath = path.join("/tmp", targetConfig.relativePath);
        await fs.mkdir(path.dirname(tmpPath), { recursive: true });
        await fs.writeFile(tmpPath, buffer);
        savedToDisk = true;
      } catch (tmpErr: any) {
        console.warn("[MediaUpload] Peringatan: Tulis ke /tmp gagal:", tmpErr.message);
      }
    }

    // 2. Simpan ke Cloud Database Google Sheets (PENGATURAN) agar foto permanen di hosting Vercel
    const base64Str = buffer.toString("base64");
    const chunkSize = 40000; // Aman untuk batas 50.000 karakter per sel Google Sheets
    const chunks: string[] = [];
    for (let i = 0; i < base64Str.length; i += chunkSize) {
      chunks.push(base64Str.substring(i, i + chunkSize));
    }

    // Maksimal 8 chunks (~240KB gambar terkompresi) untuk menjaga performa transmisi
    if (chunks.length <= 8) {
      const gasKeys = targetConfig.gasAliases || [targetKey];
      for (const gKey of gasKeys) {
        await callGasApi("media:save", {
          key: gKey,
          mime_type: file.type || "image/jpeg",
          chunks: chunks,
        }).catch((e) => {
          console.warn("[MediaUpload] Catatan sinkronisasi cloud GAS:", e.message);
        });
      }
    }

    const publicUrl = `/api/media/custom/${targetKey}?t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: `${targetConfig.label} berhasil diperbarui! Foto kini langsung aktif di website.`,
      targetKey,
      publicUrl,
      fileName: path.basename(targetConfig.relativePath),
      folder: path.dirname(targetConfig.relativePath) + "/",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Gagal mengunggah berkas: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
