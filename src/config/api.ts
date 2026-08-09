// src/config/api.ts
import Constants from 'expo-constants';

const PORT = '3000';

// Isi ini hanya kalau auto-detect di bawah gagal (mis. device fisik tanpa Metro
// saat dev). Saat dev lewat Expo Go/dev client, IP LAN terdeteksi otomatis dari
// host Metro bundler, jadi biasanya tidak perlu diubah manual lagi tiap ganti WiFi.
const FALLBACK_LOCAL_IP = '192.168.100.104';

// URL backend yang sudah di-hosting — dipakai untuk build produksi (APK/IPA),
// karena build produksi tidak punya Metro bundler untuk auto-detect IP lokal.
const PRODUCTION_API_URL = 'https://mda-mengaji.vercel.app';

function detectDevServerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) return null;
  return hostUri.split(':')[0];
}

function resolveApiUrl(): string {
  if (!__DEV__) return PRODUCTION_API_URL;
  const resolvedHost = detectDevServerHost() || FALLBACK_LOCAL_IP;
  return `http://${resolvedHost}:${PORT}`;
}

export const API_URL = resolveApiUrl();

// Domain publik (Vercel) tempat halaman web (login guru, detail kabar publik, dsb) di-host.
// Dipakai untuk link yang perlu bisa dibuka siapa saja di luar jaringan lokal (mis. saat di-share).
export const PUBLIC_WEB_URL = PRODUCTION_API_URL;
