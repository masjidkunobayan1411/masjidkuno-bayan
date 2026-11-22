/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Detail, Pembaruan Tarif & Deaktivasi Produk
 * Endpoint: GET, PUT, DELETE /api/products/[product_id]
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse, Product } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { product_id: string } }
) {
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

    const productId = params.product_id;
    const gasResponse = await callGasApi<Product>("product:get", {
      product_id: productId,
    });

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Produk tidak ditemukan.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Product>>({
      success: true,
      message: "Detail produk berhasil dimuat.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat produk: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { product_id: string } }
) {
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

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Hanya Super Admin yang berwenang mengubah tarif dan data produk.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const productId = params.product_id;
    const body = await request.json();

    const payload = {
      product_id: productId,
      nama_produk: String(body.nama_produk || "").trim(),
      kategori: String(body.kategori || "PAKAIAN_ADAT").trim().toUpperCase(),
      harga_sewa: Number(body.harga_sewa),
      satuan: String(body.satuan || "unit/kunjungan").trim(),
      deskripsi: String(body.deskripsi || "-").trim(),
      status: String(body.status || "AKTIF").trim().toUpperCase(),
      admin_role: user.role,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("product:update", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal memperbarui produk.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Data dan tarif sewa produk berhasil diperbarui.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memperbarui produk: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { product_id: string } }
) {
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

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Hanya Super Admin yang berwenang menonaktifkan produk.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const productId = params.product_id;

    // Soft delete: status diubah menjadi NONAKTIF sesuai aturan database
    const gasResponse = await callGasApi("product:toggle_status", {
      product_id: productId,
      status: "NONAKTIF",
      admin_role: user.role,
      admin_id: user.admin_id,
    });

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal menonaktifkan status produk.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Status produk berhasil diubah menjadi NONAKTIF.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan internal: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
