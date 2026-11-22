import type { Metadata } from "next";
// @ts-ignore CSS imports are handled by Next.js.
import "./globals.css";

export const metadata: Metadata = {
  title: "BAYAN VISITOR | Masjid Kuno Bayan",
  description:
    "Sistem Digital Registrasi Pengunjung, Statistik Kunjungan, dan Manajemen Penyewaan Pakaian Adat Masjid Kuno Bayan, Lombok Utara, NTB.",
  keywords: [
    "Masjid Kuno Bayan",
    "Bayan Visitor",
    "Lombok Utara",
    "Wisata Budaya",
    "Kain Poleng",
    "Pakaian Adat Bayan",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
