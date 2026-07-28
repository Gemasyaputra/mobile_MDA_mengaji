import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';

type Category = 'attendance' | 'learning' | 'memorization' | 'worship';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'attendance', label: 'Kehadiran' },
  { key: 'learning', label: 'Ngaji' },
  { key: 'memorization', label: 'Hafalan' },
  { key: 'worship', label: 'Ibadah' },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
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
      const isHadir = item.status === 'HADIR';
      return (
        <View key={item.id} style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
            <Text style={[styles.badge, isHadir ? styles.bgSuccess : styles.bgWarning]}>{item.status}</Text>
          </View>
          {item.notes ? <Text style={styles.recordNote}>{item.notes}</Text> : null}
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
    const groupsByDate: Record<string, { kind: 'salatGroup'; date: string; prayers: string[] }> = {};
    for (const r of recs) {
      if (r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH') {
        let group = groupsByDate[r.date];
        if (!group) {
          group = { kind: 'salatGroup', date: r.date, prayers: [] };
          groupsByDate[r.date] = group;
          items.push(group);
        }
        group.prayers.push(r.prayer_name);
      } else {
        items.push({ kind: 'single', record: r });
      }
    }
    return items;
  };

  const renderSalatGroup = (group: { date: string; prayers: string[] }, idx: number) => (
    <View key={`salat-${group.date}-${idx}`} style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatDate(group.date)}</Text>
        <Text style={styles.badge}>{group.prayers.length} Dicatat</Text>
      </View>
      <View style={styles.prayerChipRow}>
        {group.prayers.map((p, i) => (
          <View key={i} style={styles.prayerChip}>
            <Ionicons name="checkmark-circle" size={12} color="#059669" />
            <Text style={styles.prayerChipText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );

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
            <Text style={[styles.tabChipText, category === c.key && styles.tabChipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
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
              return doaBacaan.length === 0
                ? <Text style={styles.emptyText}>Belum ada riwayat untuk kategori ini.</Text>
                : doaBacaan.map(renderRecord);
            }
            if (category === 'worship') {
              const salat = records.filter((r) => r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH');
              return salat.length === 0
                ? <Text style={styles.emptyText}>Belum ada riwayat untuk kategori ini.</Text>
                : buildWorshipDisplayItems(salat).map((it, idx) => renderSalatGroup(it as any, idx));
            }
            return records.length === 0
              ? <Text style={styles.emptyText}>Belum ada riwayat untuk kategori ini.</Text>
              : records.map(renderRecord);
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
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#059669',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 13,
    color: '#6B7280',
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
  bgWarning: {
    backgroundColor: '#F59E0B',
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
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
