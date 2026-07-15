export type ActivityType = 'attendance' | 'learning' | 'new_student' | 'milestone';

export interface ActivityItem {
  type: ActivityType;
  ts: string;
  actor_name: string;
  group_name: string | null;
  student_name: string | null;
  detail: string | null;
  activity_date: string | null;
}

export interface MessageSegment {
  text: string;
  bold?: boolean;
  amber?: boolean;
}

export const TYPE_LABELS: Record<string, string> = {
  all: 'Semua',
  attendance: 'Presensi',
  learning: 'Setoran Tilawah',
  new_student: 'Santri Baru',
  milestone: 'Pencapaian',
};

export const ICON_CONFIG: Record<ActivityType, { icon: string; bg: string; color: string }> = {
  attendance: { icon: 'checkmark-done-circle-outline', bg: '#EFF6FF', color: '#3B82F6' },
  learning: { icon: 'book-outline', bg: '#F5F3FF', color: '#8B5CF6' },
  new_student: { icon: 'person-add-outline', bg: '#ECFDF5', color: '#10B981' },
  milestone: { icon: 'trophy-outline', bg: '#FFFBEB', color: '#F59E0B' },
};

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return 'Baru saja';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} minggu yang lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getDateLabel(isoString: string | null): string {
  if (!isoString) return 'Tidak diketahui';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Tidak diketahui';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hari Ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildTeacherMessage(item: ActivityItem): MessageSegment[] {
  switch (item.type) {
    case 'attendance':
      return [
        { text: 'Anda menyimpan presensi kehadiran ' },
        { text: item.group_name || 'kelas', bold: true },
        { text: '.' },
      ];
    case 'learning':
      return [
        { text: 'Anda mencatat setoran tilawah santri ' },
        { text: item.student_name || '-', bold: true },
        { text: ' — ' },
        { text: item.detail || '-', bold: true },
        { text: '.' },
      ];
    case 'new_student':
      return [
        { text: 'Admin menambahkan santri ' },
        { text: item.student_name || '-', bold: true },
        { text: ' ke kelompok Anda (' },
        { text: item.group_name || '-', bold: true },
        { text: ').' },
      ];
    case 'milestone':
      return [
        { text: '🎉 Santri ' },
        { text: item.student_name || '-', bold: true },
        { text: ' dari kelompok Anda baru saja ' },
        { text: 'Khatam Iqro', bold: true, amber: true },
        { text: ' dan naik ke Al-Quran!' },
      ];
    default:
      return [{ text: 'Aktivitas tidak diketahui.' }];
  }
}
