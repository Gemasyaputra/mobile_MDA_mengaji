import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';

function formatLevel(item: any) {
  if (item.readingLevel === 'ALQURAN') return 'Al-Qur\'an';
  return item.currentLevel || 'Iqro';
}

export default function TeacherSantriListScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<any[]>([]);

  const fetchStudents = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('teacher_token');
      if (!token) {
        setError('Sesi tidak valid. Silakan login ulang.');
        return;
      }
      const url = `${API_URL}/api/mobile/teacher/students?token=${encodeURIComponent(token)}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
      const response = await axios.get(url);
      if (response.data.success) {
        setStudents(response.data.data || []);
      } else {
        setError(response.data.message || 'Gagal memuat daftar santri.');
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.error(err);
        setError('Tidak dapat memuat daftar santri. Periksa koneksi ke server.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchStudents(search), 300);
    return () => clearTimeout(timeout);
  }, [search, fetchStudents]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Santri</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama santri..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchStudents(search)}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada santri ditemukan.</Text>}
          ListFooterComponent={
            students.length > 0 ? (
              <Text style={styles.summaryText}>Total: {students.length} Santri</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TeacherSantriDetail', { studentId: item.id, studentName: item.name })}
            >
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.level}>{formatLevel(item)}{item.groupName ? ` • ${item.groupName}` : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', padding: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#059669', fontWeight: 'bold', fontSize: 16 },
  avatarImage: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  level: { fontSize: 12, color: '#64748B', marginTop: 2 },
  summaryText: { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 8 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', marginTop: 40 },
  errorText: { color: '#DC2626', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  retryButton: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
