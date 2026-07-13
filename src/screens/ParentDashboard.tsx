import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

function formatReadingLevel(level?: string) {
  if (level === 'ALQURAN') return "Al-Qur'an";
  if (level === 'IQRO') return 'Iqro';
  return level || '-';
}

function attendanceColor(pct: number) {
  if (pct >= 80) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

export default function ParentDashboard({ route, navigation }: any) {
  const { slug } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [kabarPreview, setKabarPreview] = useState<any>(null);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('parent_student_slug');
    const rootNavigation = navigation.getParent() || navigation;
    rootNavigation.replace('DevLogin');
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/mobile/parent/student/${slug}`);
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.message || 'Gagal mengambil data.');
      }
    } catch (err: any) {
      console.error(err);
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || 'Tidak dapat terhubung ke server. Pastikan Next.js berjalan dan IP laptop benar.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchKabarPreview = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/activities?limit=1`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        setKabarPreview(response.data.data[0]);
      }
    } catch (err) {
      console.error('Gagal memuat kabar terbaru', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchKabarPreview();
  }, [fetchData, fetchKabarPreview]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Memuat data santri...</Text>
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
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: '#EF4444', marginTop: 10 }]} onPress={handleLogout}>
          <Text style={styles.retryText}>Ganti Akun</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const attendancePct = data?.attendanceSummary?.thisMonthPercentage ?? null;
  const initial = (data?.student?.name || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Assalamu'alaikum,</Text>
          <Text style={styles.parentName}>{data?.student?.parentName || 'Bapak/Ibu'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{data?.student?.name}</Text>
            <Text style={styles.studentLevel}>{formatReadingLevel(data?.student?.readingLevel)} · {data?.student?.currentLevel || '-'}</Text>
            {data?.latestLearning && (
              <Text style={styles.studentPosition} numberOfLines={1}>
                Posisi: {data.latestLearning.levelOrSurah} ({data.latestLearning.startPoint}-{data.latestLearning.endPoint})
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Ionicons name="checkmark-circle" size={20} color={attendancePct !== null ? attendanceColor(attendancePct) : '#D1D5DB'} />
            <Text style={styles.statValue}>{attendancePct !== null ? `${attendancePct}%` : '-'}</Text>
            <Text style={styles.statLabel}>Hadir Bulan Ini</Text>
          </View>
          <View style={styles.statTile}>
            <Ionicons name="book" size={20} color="#059669" />
            <Text style={styles.statValue}>{data?.latestLearning?.quality || '-'}</Text>
            <Text style={styles.statLabel}>Nilai Ngaji</Text>
          </View>
          <View style={styles.statTile}>
            <Ionicons name="ribbon" size={20} color="#059669" />
            <Text style={styles.statValue}>
              {data?.latestWorship ? (data.latestWorship.isCompleted ? 'Lulus' : 'Belum') : '-'}
            </Text>
            <Text style={styles.statLabel}>Ibadah Terakhir</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.kabarTeaser}
          activeOpacity={0.85}
          onPress={() =>
            kabarPreview
              ? navigation.navigate('ParentKabarDetail', { id: kabarPreview.id })
              : navigation.jumpTo('Kabar')
          }
        >
          {kabarPreview && Array.isArray(kabarPreview.images) && kabarPreview.images.length > 0 ? (
            <Image source={{ uri: kabarPreview.images[0] }} style={styles.kabarThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.kabarThumb, styles.kabarThumbPlaceholder]}>
              <Ionicons name="megaphone" size={20} color="#FFFFFF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.kabarLabel}>KABAR TERBARU</Text>
            <Text style={styles.kabarTitle} numberOfLines={1}>
              {kabarPreview ? kabarPreview.title : 'Belum ada kabar'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.progressCta} onPress={() => navigation.jumpTo('Progres')}>
          <Ionicons name="stats-chart" size={16} color="#059669" />
          <Text style={styles.progressCtaText}>Lihat Progres Lengkap & Riwayat</Text>
          <Ionicons name="chevron-forward" size={16} color="#059669" />
        </TouchableOpacity>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 13,
    color: '#D1FAE5',
  },
  parentName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#059669',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  studentLevel: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  studentPosition: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  kabarTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kabarThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  kabarThumbPlaceholder: {
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kabarLabel: {
    fontSize: 9,
    color: '#059669',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  kabarTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  progressCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  progressCtaText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 13,
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
