/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * API Route Handler: Manajemen Akun Petugas & Super Admin
 * Endpoint: /api/admins
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callGasApi } from "@/lib/gas-client";
import { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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
          message: "Akses ditolak: Hanya Super Admin yang berhak mengelola akun admin.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const gasResponse = await callGasApi("auth:list_admins", {
      current_admin_role: user.role,
      current_admin_id: user.admin_id,
    });

    if (gasResponse.success) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: "Daftar akun admin berhasil dimuat.",
        data: gasResponse.data || [],
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: gasResponse.message || "Gagal memuat daftar admin.",
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
        message: `Terjadi kesalahan saat memuat admin: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Sesi tidak aktif.",
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
          message: "Akses ditolak: Hanya Super Admin yang berhak membuat akun admin baru.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nama, email, password, role } = body;

    if (!nama || !email || !password) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Nama, email, dan kata sandi wajib diisi.",
          data: null,
          errors: ["Validation Error"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const gasResponse = await callGasApi("auth:create_admin", {
      nama,
      email,
      password,
      role: role || "ADMIN",
      current_admin_role: user.role,
      current_admin_id: user.admin_id,
    });

    if (gasResponse.success) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: gasResponse.message || "Akun admin berhasil dibuat.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: gasResponse.message || "Gagal membuat akun admin.",
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
        message: `Terjadi kesalahan saat membuat admin: ${err.message}`,
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
          message: "Sesi tidak aktif.",
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
          message: "Akses ditolak: Hanya Super Admin yang berhak memperbarui akun admin.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { admin_id, nama, status, role, password } = body;

    if (!admin_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "admin_id wajib disertakan.",
          data: null,
          errors: ["Validation Error"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const gasResponse = await callGasApi("auth:update_admin", {
      admin_id,
      nama,
      status,
      role,
      password,
      current_admin_role: user.role,
      current_admin_id: user.admin_id,
    });

    if (gasResponse.success) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: gasResponse.message || "Akun admin berhasil diperbarui.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: gasResponse.message || "Gagal memperbarui akun admin.",
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
        message: `Terjadi kesalahan saat update admin: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Sesi tidak aktif.",
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
          message: "Akses ditolak: Hanya Super Admin yang berhak menghapus akun admin.",
          data: null,
          errors: ["Forbidden"],
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const admin_id = searchParams.get("admin_id");

    if (!admin_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "admin_id wajib disertakan.",
          data: null,
          errors: ["Validation Error"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (admin_id === user.admin_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: "Anda tidak dapat menghapus akun Anda sendiri.",
          data: null,
          errors: ["Validation Error"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const gasResponse = await callGasApi("auth:delete_admin", {
      admin_id,
      current_admin_role: user.role,
      current_admin_id: user.admin_id,
    });

    if (gasResponse.success) {
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: gasResponse.message || "Akun admin berhasil dihapus.",
        data: gasResponse.data,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: gasResponse.message || "Gagal menghapus akun admin.",
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
        message: `Terjadi kesalahan saat menghapus admin: ${err.message}`,
        data: null,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
