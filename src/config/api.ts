// src/config/api.ts
import Constants from 'expo-constants';

const PORT = '3000';

// Isi ini hanya kalau auto-detect di bawah gagal (mis. build produksi / device fisik
// tanpa Metro). Saat dev lewat Expo Go/dev client, IP LAN terdeteksi otomatis dari
// host Metro bundler, jadi biasanya tidak perlu diubah manual lagi tiap ganti WiFi.
const FALLBACK_LOCAL_IP = '192.168.100.104';

function detectDevServerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) return null;
  return hostUri.split(':')[0];
}

const resolvedHost = detectDevServerHost() || FALLBACK_LOCAL_IP;

export const API_URL = `http://${resolvedHost}:${PORT}`;

// Domain publik (Vercel) tempat halaman web (login guru, detail kabar publik, dsb) di-host.
// Dipakai untuk link yang perlu bisa dibuka siapa saja di luar jaringan lokal (mis. saat di-share).
export const PUBLIC_WEB_URL = 'https://mda-mengaji.vercel.app';
