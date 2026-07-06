import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function ParentDashboard({ route, navigation }: any) {
  const { slug } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('parent_student_slug');
    navigation.replace('DevLogin');
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
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
  };

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
        <TouchableOpacity style={[styles.retryButton, {backgroundColor: '#EF4444', marginTop: 10}]} onPress={handleLogout}>
          <Text style={styles.retryText}>Ganti Akun</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Assalamu'alaikum,</Text>
          <Text style={styles.parentName}>{data?.parentName || 'Bapak/Ibu'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Ganti Akun</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Santri</Text>
          <View style={styles.divider} />
          
          <Text style={styles.label}>Nama Lengkap:</Text>
          <Text style={styles.value}>{data?.student?.name}</Text>
          
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tingkat:</Text>
              <Text style={styles.valueBadge}>{data?.student?.readingLevel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Kelas/Jilid:</Text>
              <Text style={styles.valueBadge}>{data?.student?.currentLevel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kehadiran Terakhir</Text>
          <View style={styles.divider} />
          {data?.latestAttendance ? (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Status:</Text>
                <Text style={[styles.statusBadge, data.latestAttendance.status === 'HADIR' ? styles.bgSuccess : styles.bgWarning]}>
                  {data.latestAttendance.status}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tanggal:</Text>
                <Text style={styles.value}>{new Date(data.latestAttendance.date).toLocaleDateString('id-ID')}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Belum ada data kehadiran.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progres Ngaji Terbaru</Text>
          <View style={styles.divider} />
          {data?.latestLearning ? (
             <View>
              <Text style={styles.label}>Buku / Surah:</Text>
              <Text style={styles.value}>{data.latestLearning.levelOrSurah}</Text>
              
              <Text style={styles.label}>Ayat / Halaman:</Text>
              <Text style={styles.value}>{data.latestLearning.startPoint} - {data.latestLearning.endPoint}</Text>
              
              <Text style={styles.label}>Kualitas (Nilai):</Text>
              <Text style={styles.valueBadge}>{data.latestLearning.quality}</Text>
             </View>
          ) : (
            <Text style={styles.emptyText}>Belum ada progres ngaji tercatat.</Text>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 20,
    paddingTop: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#D1FAE5',
  },
  parentName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  valueBadge: {
    fontSize: 14,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  statusBadge: {
    fontSize: 12,
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  bgSuccess: {
    backgroundColor: '#10B981',
  },
  bgWarning: {
    backgroundColor: '#F59E0B',
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
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
