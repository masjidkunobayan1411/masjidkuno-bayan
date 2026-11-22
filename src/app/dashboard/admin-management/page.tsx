"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  Shield,
  Key,
  Mail,
  User,
  Power,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Loader2,
  ShieldAlert,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { Admin, SessionUser } from "@/types";

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form Fields
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");

  // State Lihat & Salin Kata Sandi
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // State Modal Hapus Petugas
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState(false);

  // State Modal Setel Ulang Kata Sandi
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const toggleShowPassword = (adminId: string) => {
    setShowPasswordMap((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  const handleCopyPassword = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    if (currentUser?.admin_id === deleteTarget.admin_id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admins?admin_id=${deleteTarget.admin_id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setAdmins((prev) => prev.filter((a) => a.admin_id !== deleteTarget.admin_id));
        setSuccessMessage(`Akun petugas ${deleteTarget.nama} berhasil dihapus.`);
        setDeleteTarget(null);
      } else {
        alert(json.message || "Gagal menghapus akun admin.");
      }
    } catch (err: any) {
      alert("Terjadi gangguan jaringan saat menghapus akun petugas.");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError("");

    if (!newResetPassword.trim() || newResetPassword.length < 6) {
      setResetError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch("/api/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: resetTarget.admin_id,
          password: newResetPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAdmins((prev) =>
          prev.map((a) =>
            a.admin_id === resetTarget.admin_id
              ? { ...a, password_display: newResetPassword }
              : a
          )
        );
        setShowPasswordMap((prev) => ({
          ...prev,
          [resetTarget.admin_id]: true,
        }));
        setSuccessMessage(`Kata sandi petugas ${resetTarget.nama} berhasil diperbarui!`);
        setResetTarget(null);
        setNewResetPassword("");
      } else {
        setResetError(json.message || "Gagal memperbarui kata sandi.");
      }
    } catch (err: any) {
      setResetError("Terjadi gangguan jaringan saat memperbarui kata sandi.");
    } finally {
      setResetting(false);
    }
  };

  // Load Current User Profile
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCurrentUser(json.data);
        }
      })
      .catch((err) => console.error("Gagal memuat sesi profil:", err));
  }, []);

  const fetchAdmins = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admins");
      const json = await res.json();
      if (json.success && json.data) {
        setAdmins(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar admin:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!nama.trim() || !email.trim() || !password.trim()) {
      setFormError("Seluruh kolom wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setFormError("Kata sandi minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email, password, role }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMessage(`Petugas ${nama} berhasil ditambahkan!`);
        setNama("");
        setEmail("");
        setPassword("");
        setRole("ADMIN");
        setModalOpen(false);
        fetchAdmins(true);
      } else {
        setFormError(json.message || "Gagal membuat akun admin.");
      }
    } catch (err: any) {
      setFormError("Terjadi gangguan jaringan atau server tidak merespons.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    if (currentUser?.admin_id === admin.admin_id) {
      alert("Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan.");
      return;
    }

    const nextStatus = admin.status === "AKTIF" ? "NONAKTIF" : "AKTIF";
    const confirmMsg =
      nextStatus === "NONAKTIF"
        ? `Yakin ingin menonaktifkan akun petugas ${admin.nama}? Petugas ini tidak akan dapat login.`
        : `Aktifkan kembali akun petugas ${admin.nama}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: admin.admin_id, status: nextStatus }),
      });
      const json = await res.json();

      if (json.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.admin_id === admin.admin_id ? { ...a, status: nextStatus } : a))
        );
      } else {
        alert(json.message || "Gagal mengubah status akun.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleToggleRole = async (admin: Admin) => {
    if (currentUser?.admin_id === admin.admin_id) {
      alert("Anda tidak dapat mengubah peran akun Anda sendiri.");
      return;
    }

    const nextRole = admin.role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN";
    const confirmMsg = `Ubah hak akses ${admin.nama} menjadi ${nextRole}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: admin.admin_id, role: nextRole }),
      });
      const json = await res.json();

      if (json.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.admin_id === admin.admin_id ? { ...a, role: nextRole } : a))
        );
      } else {
        alert(json.message || "Gagal mengubah peran akun.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  // Metrik Ringkasan
  const totalPetugas = admins.length;
  const totalSuperAdmin = admins.filter((a) => a.role === "SUPER_ADMIN").length;
  const totalAktif = admins.filter((a) => a.status === "AKTIF").length;
  const totalNonaktif = admins.filter((a) => a.status === "NONAKTIF").length;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-serif">
                  Kelola Petugas &amp; Hak Akses
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-500 border border-amber-400/30 uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Manajemen akun pengelola cagar budaya, peran operasional, dan izin sistem
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAdmins(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => {
              setFormError("");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Petugas Baru</span>
          </button>
        </div>
      </div>

      {/* Pesan Sukses */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* 4 Kartu Metrik Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Total Petugas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
              {totalPetugas}
            </span>
            <span className="text-xs text-slate-400">akun</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Super Admin
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-serif">
              {totalSuperAdmin}
            </span>
            <span className="text-xs text-slate-400">utama</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Status Aktif
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif">
              {totalAktif}
            </span>
            <span className="text-xs text-slate-400">petugas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Nonaktif
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 font-serif">
              {totalNonaktif}
            </span>
            <span className="text-xs text-slate-400">akun</span>
          </div>
        </div>
      </div>

      {/* Tabel Data Petugas Admin */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm font-semibold">Memuat data petugas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  <th className="py-3.5 px-4">Admin ID</th>
                  <th className="py-3.5 px-4">Nama Lengkap &amp; Email</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4">Kata Sandi</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4">Terakhir Login</th>
                  <th className="py-3.5 px-4 text-center">Kelola Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admins.map((admin) => {
                  const isCurrent = currentUser?.admin_id === admin.admin_id;
                  const isSuper = admin.role === "SUPER_ADMIN";
                  const isAktif = admin.status === "AKTIF";
                  const isPasswordVisible = !!showPasswordMap[admin.admin_id];
                  const passwordText = admin.password_display || "••••••••";

                  return (
                    <tr
                      key={admin.admin_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Admin ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {admin.admin_id}
                        </span>
                        {isCurrent && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mt-1">
                            Akun Anda
                          </span>
                        )}
                      </td>

                      {/* Nama & Email */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">
                          {admin.nama}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {admin.email}
                        </span>
                      </td>

                      {/* Peran / Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isSuper
                              ? "bg-amber-400/15 text-amber-500 border-amber-400/40"
                              : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{admin.role}</span>
                        </span>
                      </td>

                      {/* Kata Sandi dengan Tombol Mata & Copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 min-w-[85px] text-center select-all">
                            {isPasswordVisible ? passwordText : "••••••••"}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleShowPassword(admin.admin_id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                            title={
                              isPasswordVisible
                                ? "Sembunyikan kata sandi"
                                : "Lihat kata sandi petugas"
                            }
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          {admin.password_display && admin.password_display !== "••••••••" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyPassword(
                                  admin.password_display || "",
                                  admin.admin_id
                                )
                              }
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                              title="Salin kata sandi"
                            >
                              {copiedId === admin.admin_id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(admin);
                              setNewResetPassword("");
                              setShowResetPassword(false);
                              setResetError("");
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                            title="Setel ulang kata sandi petugas ini"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Status Akun */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                            isAktif
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAktif ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          <span>{admin.status}</span>
                        </span>
                      </td>

                      {/* Terakhir Login */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {admin.terakhir_login || "-"}
                      </td>

                      {/* Kelola Akses */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Role Button */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleToggleRole(admin)}
                            title={
                              isCurrent
                                ? "Tidak dapat mengubah peran sendiri"
                                : isSuper
                                ? "Ubah jadi Admin biasa"
                                : "Promosikan ke Super Admin"
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              isCurrent
                                ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400"
                                : "bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 hover:text-amber-600 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isSuper ? "Turunkan" : "Jadikan Super"}
                          </button>

                          {/* Toggle Status Button */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleToggleStatus(admin)}
                            title={
                              isCurrent
                                ? "Tidak dapat menonaktifkan akun sendiri"
                                : isAktif
                                ? "Nonaktifkan Akun"
                                : "Aktifkan Akun"
                            }
                            className={`p-1.5 rounded-lg border transition-all ${
                              isCurrent
                                ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400"
                                : isAktif
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Hapus Petugas Button */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setDeleteTarget(admin)}
                            title={
                              isCurrent
                                ? "Tidak dapat menghapus akun Anda sendiri"
                                : `Hapus akun petugas ${admin.nama} secara permanen`
                            }
                            className={`p-1.5 rounded-lg border transition-all ${
                              isCurrent
                                ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 hover:text-rose-700"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH PETUGAS BARU */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">
                    Tambah Petugas Baru
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Akun akses operasional BAYAN VISITOR
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Petugas *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Raden Wirajaya"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email Akun *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="petugas@bayan.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Awal *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    title={showNewPassword ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tingkat Hak Akses (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "SUPER_ADMIN")}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="ADMIN">ADMIN (Operasional Kasir, Inventaris &amp; Tamu)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Petugas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SETEL ULANG KATA SANDI */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">
                    Ubah Kata Sandi Petugas
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Petugas: {resetTarget.nama} ({resetTarget.email})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    placeholder="Minimal 6 karakter"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    title={showResetPassword ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Kata sandi baru akan langsung aktif dan dapat dilihat oleh Super Admin di tabel.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-600/30"
                >
                  {resetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Kata Sandi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PETUGAS */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">
                    Hapus Akun Petugas
                  </h3>
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Tindakan ini tidak dapat dibatalkan
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Apakah Anda yakin ingin menghapus akun petugas berikut secara permanen dari sistem?
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {deleteTarget.nama}
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {deleteTarget.email} • {deleteTarget.role}
                </div>
                <div className="text-slate-400 text-[10px]">
                  Admin ID: {deleteTarget.admin_id}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Setelah dihapus, akun ini akan langsung dihapus dari Google Sheets dan petugas tidak akan dapat masuk kembali ke portal administrasi.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAdmin}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleting ? "Menghapus..." : "Ya, Hapus Akun"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
