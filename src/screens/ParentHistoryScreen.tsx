import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';

type Category = 'attendance' | 'learning' | 'memorization' | 'worship';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'attendance', label: 'Kehadiran', icon: 'calendar-outline' },
  { key: 'learning', label: 'Ngaji', icon: 'book-outline' },
  { key: 'memorization', label: 'Hafalan', icon: 'bookmark-outline' },
  { key: 'worship', label: 'Ibadah', icon: 'moon-outline' },
];

const ATTENDANCE_STATUS_META: Record<string, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  HADIR: { label: 'Hadir', bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle' },
  SAKIT: { label: 'Sakit', bg: '#FEF3C7', text: '#B45309', icon: 'medkit' },
  IZIN: { label: 'Izin', bg: '#DBEAFE', text: '#1D4ED8', icon: 'document-text' },
  ALFA: { label: 'Alfa', bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle' },
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatWeekday(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' });
  } catch {
    return '';
  }
}

export default function ParentHistoryScreen({ route, navigation }: any) {
  const { studentId, initialCategory } = route.params;

  const [category, setCategory] = useState<Category>(initialCategory || 'attendance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<any[]>([]);

  const fetchHistory = useCallback(async (cat: Category) => {
    try {
      setLoading(true);
      setError('');

      // Hafalan (Doa/Bacaan) dan Ibadah (Salat) sama-sama bersumber dari worship_records,
      // dipisah lewat filter di level render — bukan endpoint berbeda.
      const endpointByCategory: Record<Category, string> = {
        attendance: `/api/attendance?student_id=${studentId}`,
        learning: `/api/learning-records?student_id=${studentId}&limit=50`,
        memorization: `/api/worship-records?student_id=${studentId}&limit=50`,
        worship: `/api/worship-records?student_id=${studentId}&limit=50`,
      };

      const response = await axios.get(`${API_URL}${endpointByCategory[cat]}`);
      if (response.data.success) {
        setRecords(response.data.data || []);
      } else {
        setError(response.data.message || 'Gagal mengambil riwayat.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Tidak dapat memuat riwayat. Periksa koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchHistory(category);
  }, [category, fetchHistory]);

  const renderRecord = (item: any) => {
    if (category === 'attendance') {
      const meta = ATTENDANCE_STATUS_META[item.status] || ATTENDANCE_STATUS_META.ALFA;
      return (
        <View key={item.id} style={styles.attendanceCard}>
          <View style={[styles.attendanceIconWrap, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={22} color={meta.text} />
          </View>
          <View style={styles.attendanceBody}>
            <Text style={styles.recordWeekday}>{formatWeekday(item.date)}</Text>
            <Text style={styles.attendanceDate}>{formatDate(item.date)}</Text>
            {item.notes ? (
              <View style={styles.recordNoteRow}>
                <Ionicons name="phone-portrait-outline" size={12} color="#9CA3AF" />
                <Text style={styles.recordNote}>{item.notes}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusPillText, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>
      );
    }

    if (category === 'learning') {
      return (
        <View key={item.id} style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
            <Text style={styles.badge}>{item.quality}</Text>
          </View>
          <Text style={styles.recordTitle}>{item.type === 'QURAN' ? 'Al-Qur\'an' : 'Iqro'} — {item.level_or_surah}</Text>
          <Text style={styles.recordSub}>Halaman/Ayat: {item.start_point} - {item.end_point}</Text>
          {item.teacher_name ? <Text style={styles.recordSub}>Guru: {item.teacher_name}</Text> : null}
          {item.notes ? <Text style={styles.recordNote}>Catatan guru: {item.notes}</Text> : null}
        </View>
      );
    }

    // Hafalan = Doa Harian / Bacaan Sholat (worship_records, difilter di buildWorshipDisplayItems)
    // Ibadah (SALAT_FARDU/SALAT_SUNAH) ditangani oleh renderSalatGroup
    const title = item.type === 'BACAAN_SHOLAT' ? item.prayer_reading_title : item.daily_prayer_title;
    return (
      <View key={item.id} style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
          <Text style={styles.badge}>{item.quality}</Text>
        </View>
        <Text style={styles.recordTitle}>{title || (item.type === 'BACAAN_SHOLAT' ? 'Bacaan Sholat' : 'Doa Harian')}</Text>
        <Text style={[styles.badgeInline, item.is_completed ? styles.bgSuccess : styles.bgWarning]}>
          {item.is_completed ? 'Lulus' : 'Belum Lulus'}
        </Text>
        {item.notes ? <Text style={styles.recordNote}>Catatan guru: {item.notes}</Text> : null}
      </View>
    );
  };

  // Kelompokkan record SALAT_FARDU/SALAT_SUNAH per tanggal jadi satu kartu (bisa 5x/hari)
  const buildWorshipDisplayItems = (recs: any[]) => {
    const items: any[] = [];
    const groupsByDate: Record<string, { kind: 'salatGroup'; date: string; prayers: { name: string; recordedBy: string }[] }> = {};
    for (const r of recs) {
      if (r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH') {
        let group = groupsByDate[r.date];
        if (!group) {
          group = { kind: 'salatGroup', date: r.date, prayers: [] };
          groupsByDate[r.date] = group;
          items.push(group);
        }
        group.prayers.push({ name: r.prayer_name, recordedBy: r.recorded_by || 'TEACHER' });
      } else {
        items.push({ kind: 'single', record: r });
      }
    }
    return items;
  };

  const renderSalatGroup = (group: { date: string; prayers: { name: string; recordedBy: string }[] }, idx: number) => (
    <View key={`salat-${group.date}-${idx}`} style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatDate(group.date)}</Text>
        <Text style={styles.badge}>{group.prayers.length} Dicatat</Text>
      </View>
      <View style={styles.prayerChipRow}>
        {group.prayers.map((p, i) => {
          const byParent = p.recordedBy === 'PARENT';
          return (
            <View key={i} style={[styles.prayerChip, byParent && styles.prayerChipParent]}>
              <Ionicons name="checkmark-circle" size={12} color={byParent ? '#B45309' : '#059669'} />
              <Text style={[styles.prayerChipText, byParent && styles.prayerChipTextParent]}>{p.name}</Text>
              <Text style={[styles.prayerChipSource, byParent && styles.prayerChipSourceParent]}>
                {byParent ? 'Ortu' : 'Guru'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderEmptyState = () => {
    const activeCategory = CATEGORIES.find((c) => c.key === category);
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={activeCategory?.icon || 'file-tray-outline'} size={32} color="#A7F3D0" />
        </View>
        <Text style={styles.emptyText}>Belum ada riwayat {activeCategory?.label.toLowerCase()}.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.tabRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.tabChip, category === c.key && styles.tabChipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Ionicons
              name={c.icon}
              size={14}
              color={category === c.key ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabChipText, category === c.key && styles.tabChipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Memuat riwayat...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={40} color="#DC2626" style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory(category)}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {(() => {
            // Hafalan = Doa Harian/Bacaan Sholat, Ibadah = Salat Fardu/Sunah — sama-sama dari `records` (worship_records)
            if (category === 'memorization') {
              const doaBacaan = records.filter((r) => r.type === 'DOA_HARIAN' || r.type === 'BACAAN_SHOLAT');
              return doaBacaan.length === 0 ? renderEmptyState() : doaBacaan.map(renderRecord);
            }
            if (category === 'worship') {
              const salat = records.filter((r) => r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH');
              return salat.length === 0
                ? renderEmptyState()
                : buildWorshipDisplayItems(salat).map((it, idx) => renderSalatGroup(it as any, idx));
            }
            return records.length === 0 ? renderEmptyState() : records.map(renderRecord);
          })()}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: -12,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  tabChip: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    backgroundColor: '#059669',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attendanceBody: {
    flex: 1,
  },
  recordWeekday: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  attendanceDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  recordNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  recordTitle: {
    fontSize: 17,
    color: '#111827',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  recordSub: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 2,
  },
  recordNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  badge: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  badgeInline: {
    fontSize: 11,
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 4,
    overflow: 'hidden',
  },
  bgSuccess: {
    backgroundColor: '#10B981',
  },
  prayerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  prayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  prayerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  prayerChipParent: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  prayerChipTextParent: {
    color: '#92400E',
  },
  prayerChipSource: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  prayerChipSourceParent: {
    color: '#B45309',
    backgroundColor: '#FEF3C7',
  },
  bgWarning: {
    backgroundColor: '#F59E0B',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
