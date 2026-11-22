"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  QrCode,
  ArrowLeft,
  Camera,
  CameraOff,
  SwitchCamera,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  Users,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Search,
  RefreshCw,
  Receipt,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
  Loader2,
  Upload,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ScannedVisitor {
  visit_id: string;
  visitor_id: string;
  nama_pengunjung: string;
  jenis_pengunjung: string;
  asal?: string;
  provinsi?: string;
  kabupaten_kota?: string;
  negara?: string;
  nomor_telepon?: string;
  asal_instansi?: string;
  tanggal_kunjungan: string;
  waktu_kunjungan: string;
  jumlah_dewasa: number;
  jumlah_anak: number;
  total_pengunjung: number;
  tujuan_kunjungan: string;
  status_kunjungan: string;
  dibuat_pada: string;
  visitor?: any;
}

export default function ScanCheckinPage() {
  const router = useRouter();

  // Camera & Stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(false);
  const [isBarcodeSupported, setIsBarcodeSupported] = useState<boolean>(true);

  // Scan & Detection states
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>("");
  const [autoCheckIn, setAutoCheckIn] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");

  // Result & Visitor states
  const [visitor, setVisitor] = useState<ScannedVisitor | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<boolean>(false);
  const [checkInMessage, setCheckInMessage] = useState<string>("");
  const [scanTimestamp, setScanTimestamp] = useState<string>("");

  const streamTrackRef = useRef<MediaStreamTrack | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  // Suara Beep Konfirmasi saat QR Berhasil Terbaca (Web Audio API - 100% Offline)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nada A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Abaikan jika audio di-block oleh browser policy
    }
  };

  // Getaran Haptik HP
  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // Abaikan
      }
    }
  };

  // Mulai Aliran Kamera Smartphone
  const startCamera = async () => {
    stopCamera();
    setCameraError("");
    setShowPermissionGuide(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Peramban HP Anda tidak mendukung kamera live stream HTML5. Silakan gunakan tombol 'Jepret Foto QR Langsung' di bawah."
        );
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback jika ideal constraints tidak didukung kamera perangkat
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      streamTrackRef.current = track;
      setStreamActive(true);

      // Cek apakah kamera memiliki senter / torch
      if (track && track.getCapabilities) {
        const capabilities: any = track.getCapabilities();
        setTorchSupported(!!capabilities.torch);
      }
    } catch (err: any) {
      console.error("Gagal membuka kamera:", err);
      let msg = "Tidak dapat mengakses kamera smartphone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Izin kamera ditolak oleh browser HP Anda.";
        setShowPermissionGuide(true);
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan pada perangkat ini.";
      } else if (err.name === "NotReadableError") {
        msg = "Kamera sedang digunakan oleh aplikasi lain.";
      }
      setCameraError(msg);
      setStreamActive(false);
    }
  };

  // Hentikan Kamera
  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamTrackRef.current) {
      streamTrackRef.current.stop();
      streamTrackRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setTorchOn(false);
  };

  // Toggle Senter / Torch HP
  const toggleTorch = async () => {
    if (!streamTrackRef.current || !torchSupported) return;
    try {
      const nextState = !torchOn;
      await (streamTrackRef.current as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.error("Gagal mengubah status senter:", e);
    }
  };

  // Ganti Kamera (Kamera Belakang <-> Depan)
  const switchFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Efek inisialisasi kamera dan ganti kamera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Ekstrak visit_id dari hasil scan (bisa URL atau kode polos)
  const extractVisitId = (rawText: string): string => {
    const text = rawText.trim();
    // Jika bentuk URL: https://.../tiket/VST-2026-0001
    const urlMatch = text.match(/\/tiket\/(VST-[A-Za-z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].toUpperCase();
    }

    // Jika bentuk kode VST langsung: VST-2026-0001 atau VST-XXXX
    const codeMatch = text.match(/(VST-[A-Za-z0-9_-]+)/i);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].toUpperCase();
    }

    // Fallback: hapus karakter non-alfanumerik jika ada
    return text.toUpperCase();
  };

  // Proses Kode Tiket yang Terdeteksi
  const handleDetectedCode = async (rawCode: string) => {
    const visitId = extractVisitId(rawCode);
    if (!visitId || processing) return;

    // Hindari pemindaian berulang kode yang sama dalam interval pendek jika sudah tampil
    if (visitor && visitor.visit_id === visitId) return;

    setProcessing(true);
    setLastScannedCode(visitId);
    playBeep();
    triggerHaptic();

    try {
      // 1. Ambil Data Detail Tiket
      const res = await fetch(`/api/public/ticket/${encodeURIComponent(visitId)}`);
      const json = await res.json();

      let visitorData: ScannedVisitor;
      if (res.ok && json.success && json.data) {
        const raw = json.data;
        const v = raw.visitor || {};
        const jenisPengunjung = raw.jenis_pengunjung || v.jenis_pengunjung || "DOMESTIK";
        const kabKota = raw.kabupaten_kota || v.kabupaten_kota || "";
        const prov = raw.provinsi || v.provinsi || "";
        const neg = raw.negara || v.negara || (jenisPengunjung === "DOMESTIK" ? "INDONESIA" : "Mancanegara");

        let asalStr = raw.asal || "";
        if (!asalStr) {
          if (jenisPengunjung === "DOMESTIK") {
            asalStr = [kabKota, prov || "Indonesia"].filter(Boolean).join(", ");
          } else {
            asalStr = neg;
          }
        }

        visitorData = {
          ...raw,
          nama_pengunjung: raw.nama_pengunjung || v.nama_pengunjung || v.nama_lengkap || "Pengunjung Terdaftar",
          jenis_pengunjung: jenisPengunjung,
          kabupaten_kota: kabKota,
          provinsi: prov,
          negara: neg,
          asal: asalStr,
          nomor_telepon: raw.nomor_telepon || v.nomor_telepon || "",
          asal_instansi: raw.asal_instansi || v.asal_instansi || "",
        };
      } else {
        // Fallback jika API spesifik tidak menemukan, cari di daftar kunjungan
        const searchRes = await fetch(`/api/visits?search=${encodeURIComponent(visitId)}`);
        const searchJson = await searchRes.json();
        if (searchRes.ok && searchJson.success && searchJson.data?.items?.length > 0) {
          const raw = searchJson.data.items[0];
          const v = raw.visitor || {};
          const jenisPengunjung = raw.jenis_pengunjung || v.jenis_pengunjung || "DOMESTIK";
          const kabKota = raw.kabupaten_kota || v.kabupaten_kota || "";
          const prov = raw.provinsi || v.provinsi || "";
          const neg = raw.negara || v.negara || (jenisPengunjung === "DOMESTIK" ? "INDONESIA" : "Mancanegara");

          let asalStr = raw.asal || "";
          if (!asalStr) {
            if (jenisPengunjung === "DOMESTIK") {
              asalStr = [kabKota, prov || "Indonesia"].filter(Boolean).join(", ");
            } else {
              asalStr = neg;
            }
          }

          visitorData = {
            ...raw,
            nama_pengunjung: raw.nama_pengunjung || v.nama_pengunjung || v.nama_lengkap || "Pengunjung Terdaftar",
            jenis_pengunjung: jenisPengunjung,
            kabupaten_kota: kabKota,
            provinsi: prov,
            negara: neg,
            asal: asalStr,
            nomor_telepon: raw.nomor_telepon || v.nomor_telepon || "",
            asal_instansi: raw.asal_instansi || v.asal_instansi || "",
          };
        } else {
          setCameraError(`Nomor Tiket [${visitId}] tidak terdaftar di sistem.`);
          setProcessing(false);
          return;
        }
      }

      setVisitor(visitorData);
      setScanTimestamp(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        })
      );

      // 2. Eksekusi Verifikasi Otomatis jika mode aktif
      if (autoCheckIn) {
        await executeVerification(visitorData.visit_id);
      } else {
        setCheckInMessage("Tiket ditemukan. Silakan klik 'Konfirmasi Verifikasi' di bawah.");
      }
    } catch (err: any) {
      console.error("Gagal memproses tiket:", err);
      setCameraError("Gagal menghubungi server untuk memverifikasi tiket.");
    } finally {
      setProcessing(false);
    }
  };

  // Eksekusi Update Status ke TERVERIFIKASI
  const executeVerification = async (visitId: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_id: visitId,
          status: "TERVERIFIKASI",
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setCheckInSuccess(true);
        setCheckInMessage("Status BERHASIL TERVERIFIKASI! Kehadiran pengunjung telah dicatat di Buku Tamu.");
        setVisitor((prev) => (prev ? { ...prev, status_kunjungan: "TERVERIFIKASI" } : null));
        playBeep();
      } else {
        setCheckInSuccess(false);
        setCheckInMessage(json.message || "Gagal memperbarui status ke TERVERIFIKASI.");
      }
    } catch (err: any) {
      console.error("Gagal verifikasi status:", err);
      setCheckInSuccess(false);
      setCheckInMessage("Terjadi kendala jaringan saat memverifikasi tiket.");
    } finally {
      setProcessing(false);
    }
  };

  // Real-time Detection Loop menggunakan Browser BarcodeDetector + jsQR Fallback
  useEffect(() => {
    if (!streamActive || !isScanning || visitor !== null) return;

    let isDetecting = false;
    let detector: any = null;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    if (!detector) {
      setIsBarcodeSupported(false);
    } else {
      setIsBarcodeSupported(true);
    }

    const scanFrame = async () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        !isDetecting
      ) {
        isDetecting = true;
        try {
          let foundCode = "";

          // 1. Coba BarcodeDetector native jika didukung
          if (detector) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                foundCode = barcodes[0].rawValue;
              }
            } catch {}
          }

          // 2. Fallback jsQR via Canvas (kompatibel 100% di semua browser HP Android & iOS)
          if (!foundCode && typeof window !== "undefined" && (window as any).jsQR) {
            const canvas = canvasRef.current || document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx && videoRef.current) {
              const vW = videoRef.current.videoWidth || 640;
              const vH = videoRef.current.videoHeight || 480;
              if (canvas.width !== vW || canvas.height !== vH) {
                canvas.width = vW;
                canvas.height = vH;
              }
              ctx.drawImage(videoRef.current, 0, 0, vW, vH);
              const imgData = ctx.getImageData(0, 0, vW, vH);
              const qrResult = (window as any).jsQR(imgData.data, vW, vH, {
                inversionAttempts: "dontInvert",
              });
              if (qrResult && qrResult.data) {
                foundCode = qrResult.data;
              }
            }
          }

          if (foundCode) {
            handleDetectedCode(foundCode);
          }
        } catch {
          // Frame lewatkan jika deteksi gagal
        } finally {
          isDetecting = false;
        }
      }

      if (streamActive && isScanning && visitor === null) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [streamActive, isScanning, visitor]);

  // Reset Scanner untuk Pengunjung Berikutnya
  const handleResetScanner = () => {
    setVisitor(null);
    setCheckInSuccess(false);
    setCheckInMessage("");
    setLastScannedCode("");
    setManualCode("");
    setIsScanning(true);
  };

  // Submit Pencarian Manual (Bisa ketik no tiket atau nama)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim());
  };

  // Scan dari Gambar / Jepret Kamera HP Langsung
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setCameraError("");

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = async () => {
        let foundCode = "";

        // 1. Coba BarcodeDetector native
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              foundCode = barcodes[0].rawValue;
            }
          } catch (err) {
            console.warn("BarcodeDetector image fallback:", err);
          }
        }

        // 2. Fallback jsQR via Canvas (Universal untuk semua HP)
        if (!foundCode) {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const maxDim = 1200;
              let w = img.naturalWidth || img.width;
              let h = img.naturalHeight || img.height;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(img, 0, 0, w, h);
              const imgData = ctx.getImageData(0, 0, w, h);

              if (typeof window !== "undefined" && (window as any).jsQR) {
                const qrRes = (window as any).jsQR(imgData.data, w, h);
                if (qrRes && qrRes.data) {
                  foundCode = qrRes.data;
                }
              }
            }
          } catch (cErr) {
            console.error("Canvas jsQR error:", cErr);
          }
        }

        URL.revokeObjectURL(objectUrl);

        if (foundCode) {
          handleDetectedCode(foundCode);
        } else {
          setCameraError(
            "QR Code tidak terdeteksi dari foto. Pastikan foto pas di tengah QR, terang dan tidak buram, atau gunakan pencarian nomor tiket di bawah."
          );
          setProcessing(false);
        }
      };
    } catch (err) {
      setCameraError("Gagal membaca file foto.");
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/kunjungan"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all"
            title="Kembali ke Buku Kunjungan"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Presensi Digital
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Mobile &amp; HP Scanner</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2 mt-0.5">
              <span>Scan QR Presensi Buku Tamu</span>
            </h1>
          </div>
        </div>

        {/* Mode Auto Verifikasi Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-auto">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Auto-Verifikasi:</span>
          <button
            type="button"
            onClick={() => setAutoCheckIn(!autoCheckIn)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              autoCheckIn
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            {autoCheckIn ? "AKTIF (Instan)" : "MANUAL (Review)"}
          </button>
        </div>
      </div>

      {/* Tampilan Error Kamera & Panduan Solusi HP */}
      {cameraError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Perhatian Akses Kamera:</p>
                <p className="mt-0.5 leading-relaxed text-slate-700 dark:text-slate-300">{cameraError}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCameraError("");
                  startCamera();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Coba Lagi
              </button>
            </div>
          </div>

          {/* Solusi Langsung: Jepret Foto QR Menggunakan Kamera HP */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Solusi Cepat: Buka kamera HP langsung untuk jepret QR Code tanpa kendala izin browser.
              </span>
            </div>
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-md transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Jepret Foto QR Langsung</span>
            </button>
          </div>

          {/* Panduan Membuka Izin Kamera di Pengaturan Browser HP */}
          {showPermissionGuide && (
            <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cara Mengaktifkan Izin Kamera di Browser HP Anda:</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-900/30">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                    1. Google Chrome &amp; Browser Android:
                  </span>
                  Ketuk ikon <strong>Gembok (🔒)</strong> di sebelah kiri alamat web atas &gt; pilih <strong>Izin (Permissions)</strong> &gt; ubah <strong>Kamera</strong> menjadi <strong>Izinkan (Allow)</strong> &gt; ketuk tombol Coba Lagi di atas.
                </div>
                <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-900/30">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                    2. Safari di iPhone (iOS):
                  </span>
                  Ketuk ikon <strong>aA</strong> di kolom alamat atas &gt; pilih <strong>Pengaturan Situs Web</strong> &gt; pilih <strong>Kamera</strong> &gt; ubah ke <strong>Izinkan</strong>.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTAINER: KAMERA ATAU HASIL SCAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Live Camera Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-slate-800">
            {/* Element Video Kamera */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                streamActive ? "opacity-100" : "opacity-0"
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Placeholder jika Kamera Belum Aktif */}
            {!streamActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 border border-slate-700">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Kamera Sedang Tidak Aktif</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Nyalakan kamera live streaming atau gunakan kamera HP langsung untuk memindai tiket.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full max-w-xs justify-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Nyalakan Kamera HP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Jepret Foto QR</span>
                  </button>
                </div>
              </div>
            )}

            {/* Reticle / Bingkai Bidik Scanner & Laser Animasi */}
            {streamActive && visitor === null && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Kotak Bidik QR */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-dashed border-emerald-400/70 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Siku-Siku Pojok Hijau Neon */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                  {/* Garis Laser Animasi Scan */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 shadow-[0_0_12px_#10b981] animate-pulse transition-all duration-75" />
                </div>

                {/* Badge Status Deteksi di Bawah Kotak */}
                <div className="absolute bottom-4 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Mengarahkan ke QR Code E-Tiket...</span>
                </div>
              </div>
            )}

            {/* Indikator Loading Saat Memproses Tiket */}
            {processing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 z-20">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-sm font-bold">Memverifikasi &amp; Check-in...</p>
              </div>
            )}
          </div>

          {/* Kontrol Kamera Baris Bawah */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {streamActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <CameraOff className="w-4 h-4 text-rose-500" />
                  <span>Jeda Kamera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Nyalakan Kamera</span>
                </button>
              )}

              <button
                type="button"
                onClick={switchFacingMode}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Ganti Kamera Belakang / Depan"
              >
                <SwitchCamera className="w-4 h-4 text-blue-500" />
                <span>{facingMode === "environment" ? "Kamera Belakang" : "Kamera Depan"}</span>
              </button>
            </div>

            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  torchOn
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                <span>{torchOn ? "Lampu Nyala" : "Nyalakan Senter"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Kartu Hasil Verifikasi & Aksi Check-In (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {visitor ? (
            /* KARTU HASIL SCAN TIKET */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500 dark:border-emerald-600 p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Status Header Badge */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      {visitor.status_kunjungan === "TERVERIFIKASI" || visitor.status_kunjungan === "SELESAI"
                        ? "Terverifikasi"
                        : "Menunggu Verifikasi"}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {visitor.visit_id}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    visitor.status_kunjungan === "TERVERIFIKASI" || visitor.status_kunjungan === "SELESAI"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {visitor.status_kunjungan}
                </span>
              </div>

              {/* Rincian Identitas Pengunjung */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Nama Perwakilan / Rombongan:
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {visitor.nama_pengunjung || visitor.visitor?.nama_pengunjung || "Pengunjung Terdaftar"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Kategori</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {visitor.jenis_pengunjung || visitor.visitor?.jenis_pengunjung || "DOMESTIK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Jumlah Orang</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {visitor.total_pengunjung} Orang
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({visitor.jumlah_dewasa} Dws, {visitor.jumlah_anak} Ank)
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Asal Daerah / Negara</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>
                        {visitor.asal ||
                          ((visitor.jenis_pengunjung || visitor.visitor?.jenis_pengunjung) === "DOMESTIK"
                            ? [
                                visitor.kabupaten_kota || visitor.visitor?.kabupaten_kota,
                                visitor.provinsi || visitor.visitor?.provinsi || "Indonesia",
                              ]
                                .filter(Boolean)
                                .join(", ")
                            : visitor.negara || visitor.visitor?.negara || "Mancanegara")}
                      </span>
                    </span>
                  </div>
                </div>

                {(visitor.nomor_telepon || visitor.visitor?.nomor_telepon) && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kontak: {visitor.nomor_telepon || visitor.visitor?.nomor_telepon}</span>
                  </div>
                )}
              </div>

              {/* Notifikasi Pesan Check-In */}
              {checkInMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    checkInSuccess
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{checkInMessage}</span>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {visitor.status_kunjungan !== "TERVERIFIKASI" && visitor.status_kunjungan !== "SELESAI" ? (
                  <button
                    type="button"
                    onClick={() => executeVerification(visitor.visit_id)}
                    disabled={processing}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Konfirmasi Verifikasi Sekarang</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Tiket Kunjungan Sah &amp; Terverifikasi</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Pengunjung Berikutnya</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href={`/dashboard/transaksi/baru?visit_id=${encodeURIComponent(visitor.visit_id)}`}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sewa Kain Adat</span>
                  </Link>

                  <Link
                    href={`/tiket/${encodeURIComponent(visitor.visit_id)}`}
                    target="_blank"
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka E-Tiket</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* PANDUAN PENGGUNAAN SCANNER HP */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-serif font-bold text-sm sm:text-base">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Petunjuk Petugas Presensi:</span>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                    1
                  </span>
                  <p className="leading-relaxed">
                    Minta pengunjung membuka layar HP yang menampilkan **E-Tiket**.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                    2
                  </span>
                  <p className="leading-relaxed">
                    Arahkan kamera HP petugas ke dalam kotak bidik. Sistem otomatis mendeteksi kode QR dalam sekejap.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                    3
                  </span>
                  <p className="leading-relaxed">
                    Saat mode **Auto-Verifikasi AKTIF**, status kunjungan otomatis diperbarui ke **TERVERIFIKASI** di Google Spreadsheet &amp; Buku Tamu secara *real-time*.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Keuntungan Presensi Kamera HP:</span>
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Petugas pos tidak perlu membawa komputer besar. Cukup buka dashboard ini dari peramban HP Android atau iPhone di meja pos tiket.
                </p>
              </div>
            </div>
          )}

          {/* OPSI CADANGAN: INPUT MANUAL / UPLOAD FOTO QR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
              Opsi Cadangan (Tanpa Kamera Live)
            </span>

            {/* Input Kode Nomor Tiket */}
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ketik Nomor Tiket (misal: VST-2026-0001)..."
                  className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || processing}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-bold transition-all"
                >
                  Verifikasi
                </button>
              </div>
            </form>

            {/* Unggah Gambar / Foto Galeri / Native Camera */}
            <label className="cursor-pointer block">
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-medium flex items-center justify-center gap-2 transition-all">
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>Pindai dari Foto Galeri / Jepret Kamera HP</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Script Decoder QR Code Client-Side Universal (jsQR) */}
      <Script
        src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
