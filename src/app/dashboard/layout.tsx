/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Layout Shell Dashboard Admin Operasional & Super Admin
 * File: src/app/dashboard/layout.tsx
 * ============================================================================
 */

import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Dashboard Operasional • BAYAN VISITOR",
  description: "Panel Pengelolaan Kunjungan dan Penyewaan Pakaian Adat Masjid Kuno Bayan",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
