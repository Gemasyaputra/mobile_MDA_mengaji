export function qualityBadgeColor(quality: number | null | undefined) {
  const q = Number(quality);
  if (!Number.isFinite(q)) return { bg: '#F1F5F9', fg: '#64748B' };
  if (q >= 9) return { bg: '#D1FAE5', fg: '#059669' };
  if (q >= 7) return { bg: '#DBEAFE', fg: '#2563EB' };
  if (q >= 5) return { bg: '#FEF3C7', fg: '#D97706' };
  return { bg: '#FEE2E2', fg: '#DC2626' };
}
