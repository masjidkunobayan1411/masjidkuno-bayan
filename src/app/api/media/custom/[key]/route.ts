/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Menyajikan Media & Foto Kustom (Cloud / Local)
 * Endpoint: GET /api/media/custom/[key]
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { callGasApi } from "@/lib/gas-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_TARGETS: Record<
  string,
  { relativePath: string; mimeType: string; altFilenames?: string[] }
> = {
  "jejak-peradaban": {
    relativePath: "public/media/photos/heritage/jejak-peradaban.jpg",
    mimeType: "image/jpeg",
  },
  "hero-bayan": {
    relativePath: "public/media/photos/heritage/hero-bayan.jpg",
    mimeType: "image/jpeg",
  },
  "masjid-kuno": {
    relativePath: "public/media/photos/heritage/masjid-kuno.jpg",
    mimeType: "image/jpeg",
  },
  "makam-wali": {
    relativePath: "public/media/photos/heritage/makam-wali.jpg",
    mimeType: "image/jpeg",
  },
  "maulid-adat": {
    relativePath: "public/media/photos/heritage/maulid-adat.jpg",
    mimeType: "image/jpeg",
  },
  "desa-bayan": {
    relativePath: "public/media/photos/heritage/desa-bayan.jpg",
    mimeType: "image/jpeg",
  },
  logo: {
    relativePath: "public/media/logo/logo.png",
    mimeType: "image/png",
    altFilenames: ["Logo.png", "logo.svg"],
  },
  "qris-dana": {
    relativePath: "public/media/qris/qris-dana.png",
    mimeType: "image/png",
  },
  "qris-bayannesia": {
    relativePath: "public/media/qris/qris-bayannesia.png",
    mimeType: "image/png",
  },
  "qris-bumdes": {
    relativePath: "public/media/qris/qris-bumdes.png",
    mimeType: "image/png",
  },
  "kain-poleng": {
    relativePath: "public/media/photos/products/kainpoleng.jpg",
    mimeType: "image/jpeg",
    altFilenames: ["kain-poleng.jpg", "kainpoleng.svg", "kain-poleng.svg"],
  },
  "kainpoleng": {
    relativePath: "public/media/photos/products/kainpoleng.jpg",
    mimeType: "image/jpeg",
    altFilenames: ["kain-poleng.jpg", "kainpoleng.svg", "kain-poleng.svg"],
  },
  "kain-batik": {
    relativePath: "public/media/photos/products/kainbatik.jpg",
    mimeType: "image/jpeg",
    altFilenames: ["kain-batik.jpg", "kainbatik.svg", "kain-batik.svg"],
  },
  "kainbatik": {
    relativePath: "public/media/photos/products/kainbatik.jpg",
    mimeType: "image/jpeg",
    altFilenames: ["kain-batik.jpg", "kainbatik.svg", "kain-batik.svg"],
  },
  "sapuk-sabuk": {
    relativePath: "public/media/photos/products/sapukjong.jpg",
    mimeType: "image/jpeg",
    altFilenames: [
      "sapuk-sabuk.jpg",
      "sapuk-jong.jpg",
      "sapukjong.svg",
      "sapuk-sabuk.svg",
    ],
  },
  "sapukjong": {
    relativePath: "public/media/photos/products/sapukjong.jpg",
    mimeType: "image/jpeg",
    altFilenames: [
      "sapuk-sabuk.jpg",
      "sapuk-jong.jpg",
      "sapukjong.svg",
      "sapuk-sabuk.svg",
    ],
  },
  "sapuk-jong": {
    relativePath: "public/media/photos/products/sapukjong.jpg",
    mimeType: "image/jpeg",
    altFilenames: [
      "sapuk-sabuk.jpg",
      "sapukjong.jpg",
      "sapukjong.svg",
      "sapuk-sabuk.svg",
    ],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const { key } = params;
  const config = ALLOWED_TARGETS[key];

  if (!config) {
    return new NextResponse("Media key not recognized", { status: 404 });
  }

  // 1. Cek berkas di /tmp (serverless container cache)
  try {
    const tmpPath = path.join("/tmp", config.relativePath);
    const tmpBuffer = await fs.readFile(tmpPath);
    return new NextResponse(tmpBuffer, {
      headers: {
        "Content-Type": config.mimeType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {}

  // 2. Cek berkas kustom di Google Apps Script (Cloud Database)
  const gasKeysToTry = [key];
  if (key === "kainpoleng") gasKeysToTry.push("kain-poleng");
  if (key === "kain-poleng") gasKeysToTry.push("kainpoleng");
  if (key === "kainbatik") gasKeysToTry.push("kain-batik");
  if (key === "kain-batik") gasKeysToTry.push("kainbatik");
  if (key === "sapukjong" || key === "sapuk-jong") gasKeysToTry.push("sapuk-sabuk", "sapukjong");
  if (key === "sapuk-sabuk") gasKeysToTry.push("sapukjong", "sapuk-jong");

  for (const gasKey of gasKeysToTry) {
    try {
      const gasRes = await callGasApi("media:get", { key: gasKey });
      if (gasRes.success && gasRes.data) {
        if (gasRes.data.url) {
          return NextResponse.redirect(gasRes.data.url);
        }
        if (gasRes.data.data) {
          const buffer = Buffer.from(gasRes.data.data, "base64");
          // Simpan ke /tmp untuk caching lokal serverless
          try {
            const tmpPath = path.join("/tmp", config.relativePath);
            await fs.mkdir(path.dirname(tmpPath), { recursive: true });
            await fs.writeFile(tmpPath, buffer);
          } catch {}

          return new NextResponse(buffer, {
            headers: {
              "Content-Type": gasRes.data.mimeType || config.mimeType,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          });
        }
      }
    } catch {}
  }

  // 3. Cek berkas di folder public/ lokal (dengan multi-path fallback)
  const baseDir = path.dirname(config.relativePath);
  const primaryName = path.basename(config.relativePath);
  const allNames = [primaryName, ...(config.altFilenames || [])];

  const candidatePaths: string[] = [];
  for (const name of allNames) {
    candidatePaths.push(path.join(process.cwd(), baseDir, name));
    candidatePaths.push(path.join(process.cwd(), "public/media/photos", name));
    candidatePaths.push(path.join(process.cwd(), "public/media", name));
  }

  for (const candidatePath of candidatePaths) {
    try {
      const defaultBuffer = await fs.readFile(candidatePath);
      const isSvg = candidatePath.endsWith(".svg");
      return new NextResponse(defaultBuffer, {
        headers: {
          "Content-Type": isSvg ? "image/svg+xml" : config.mimeType,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch {}
  }

  // 4. Redirect fallback ke file statis publik
  const fallbackUrl = new URL(
    `/${config.relativePath.replace(/^public\//, "")}`,
    request.url
  );
  return NextResponse.redirect(fallbackUrl);
}
