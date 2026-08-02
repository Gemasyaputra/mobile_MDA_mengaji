import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';
import AttendanceBarChart, { AttendanceChartPoint } from '../components/AttendanceBarChart';

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function attendanceColor(pct: number) {
  if (pct >= 80) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

export default function ParentProgressScreen({ route, navigation }: any) {
  const { slug } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<AttendanceChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [salatChartData, setSalatChartData] = useState<AttendanceChartPoint[]>([]);
  const [salatChartLoading, setSalatChartLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/mobile/parent/student/${slug}`);
      if (response.data.success) {
        setData(response.data.data);
        if (response.data.data?.student?.id) {
          fetchChart(response.data.data.student.id);
          fetchSalatChart(response.data.data.student.id);
        }
      } else {
        setError(response.data.message || 'Gagal mengambil data.');
      }
    } catch (err) {
      console.error(err);
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchChart = async (studentId: number) => {
    try {
      setChartLoading(true);
      const response = await axios.get(`${API_URL}/api/attendance?chart=true&student_id=${studentId}`);
      if (response.data.success) {
        setChartData(response.data.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat grafik kehadiran', err);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchSalatChart = async (studentId: number) => {
    try {
      setSalatChartLoading(true);
      const response = await axios.get(`${API_URL}/api/worship-records?chart=true&type=SALAT_FARDU&student_id=${studentId}`);
      if (response.data.success) {
        setSalatChartData(response.data.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat grafik ibadah', err);
    } finally {
      setSalatChartLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToHistory = (initialCategory: string) => {
    navigation.navigate('ParentHistory', { studentId: data?.student?.id, initialCategory });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const thisMonthPct = data?.attendanceSummary?.thisMonthPercentage ?? 0;

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const salatThisMonth = salatChartData.find((d) => d.month === currentMonthKey);
  const salatDaysRecorded = salatThisMonth ? Number(salatThisMonth.total_sessions) / 5 : 0;
  const salatAvgPerDay = salatDaysRecorded > 0 ? Number(salatThisMonth!.total_present) / salatDaysRecorded : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progres Santri</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionTitle}>Kehadiran</Text>
        <View style={styles.card}>
          <View style={styles.attendanceHeaderRow}>
            <View>
              <Text style={styles.bigStat}>
                {data?.attendanceSummary?.thisMonthHadir ?? 0}
                <Text style={styles.bigStatSub}> / {data?.attendanceSummary?.thisMonthSessions ?? 0} sesi</Text>
              </Text>
              <Text style={styles.smallLabel}>Kehadiran bulan ini</Text>
            </View>
            <View style={[styles.pctBadge, { backgroundColor: attendanceColor(thisMonthPct) }]}>
              <Text style={styles.pctBadgeText}>{thisMonthPct}%</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {chartLoading ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <AttendanceBarChart data={chartData} />
          )}

          <TouchableOpacity style={styles.historyLink} onPress={() => goToHistory('attendance')}>
            <Text style={styles.historyLinkText}>Lihat Riwayat Kehadiran</Text>
            <Ionicons name="chevron-forward" size={14} color="#059669" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Ibadah — Solat Fardu</Text>
        <View style={styles.card}>
          <View style={styles.attendanceHeaderRow}>
            <View>
              <Text style={styles.bigStat}>
                {salatAvgPerDay.toFixed(1)}
                <Text style={styles.bigStatSub}> / 5 solat rata-rata/hari</Text>
              </Text>
              <Text style={styles.smallLabel}>Bulan ini</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {salatChartLoading ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <AttendanceBarChart data={salatChartData} />
          )}

          <TouchableOpacity style={styles.historyLink} onPress={() => goToHistory('worship')}>
            <Text style={styles.historyLinkText}>Lihat Riwayat Ibadah</Text>
            <Ionicons name="chevron-forward" size={14} color="#059669" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.activityRow} onPress={() => goToHistory('learning')}>
            <View style={[styles.activityIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="book" size={16} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {data?.latestLearning ? `Ngaji: ${data.latestLearning.levelOrSurah}` : 'Belum ada progres ngaji'}
              </Text>
              {data?.latestLearning && (
                <Text style={styles.activitySub}>
                  Hal/Ayat {data.latestLearning.startPoint}-{data.latestLearning.endPoint} · {formatDate(data.latestLearning.date)}
                </Text>
              )}
            </View>
            {data?.latestLearning && <Text style={styles.activityBadge}>{data.latestLearning.quality}</Text>}
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.activityRow} onPress={() => goToHistory('memorization')}>
            <View style={[styles.activityIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="bookmark" size={16} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {data?.latestHafalan ? `Hafalan: ${data.latestHafalan.title || '-'}` : 'Belum ada hafalan'}
              </Text>
              {data?.latestHafalan && (
                <Text style={styles.activitySub}>
                  {data.latestHafalan.isCompleted ? 'Lulus' : 'Belum Lulus'} · {formatDate(data.latestHafalan.date)}
                </Text>
              )}
            </View>
            {data?.latestHafalan && <Text style={styles.activityBadge}>{data.latestHafalan.quality}</Text>}
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.activityRow} onPress={() => goToHistory('worship')}>
            <View style={[styles.activityIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="ribbon" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {data?.latestIbadah ? `Ibadah: ${data.latestIbadah.prayerName || '-'}` : 'Belum ada catatan ibadah'}
              </Text>
              {data?.latestIbadah && (
                <Text style={styles.activitySub}>{formatDate(data.latestIbadah.date)}</Text>
              )}
            </View>
            {data?.latestIbadah && <Text style={styles.activityBadge}>Sudah Solat</Text>}
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigStat: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  bigStatSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  smallLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pctBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pctBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
  },
  historyLinkText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  activitySub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityBadge: {
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
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
