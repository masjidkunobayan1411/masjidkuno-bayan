/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Detail & Pembaruan Status Unit Inventaris
 * Endpoint: GET, PUT /api/inventory/[inventory_id]
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse, InventoryItem } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { inventory_id: string } }
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

    const inventoryId = params.inventory_id;
    const gasResponse = await callGasApi("inventory:get", {
      inventory_id: inventoryId,
    });

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Unit inventaris tidak ditemukan.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Detail unit inventaris berhasil dimuat.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memuat unit: ${err.message}`,
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
  { params }: { params: { inventory_id: string } }
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

    const inventoryId = params.inventory_id;
    const body = await request.json();

    const payload = {
      inventory_id: inventoryId,
      kondisi: body.kondisi ? String(body.kondisi).toUpperCase().trim() : undefined,
      status: body.status ? String(body.status).toUpperCase().trim() : undefined,
      keterangan: body.keterangan !== undefined ? String(body.keterangan).trim() : undefined,
      admin_id: user.admin_id,
    };

    const gasResponse = await callGasApi("inventory:update", payload);

    if (!gasResponse.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: gasResponse.message || "Gagal memperbarui status unit inventaris.",
          data: null,
          errors: gasResponse.errors || [],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: "Status dan kondisi unit inventaris berhasil diperbarui.",
      data: gasResponse.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: `Terjadi kesalahan saat memperbarui inventaris: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
