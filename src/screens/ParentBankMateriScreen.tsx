import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';

type Category = 'daily-prayers' | 'prayer-readings';

export default function ParentBankMateriScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Category>('daily-prayers');
  const [dailyPrayers, setDailyPrayers] = useState<any[]>([]);
  const [prayerReadings, setPrayerReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [dp, pr] = await Promise.all([
        axios.get(`${API_URL}/api/master/daily-prayers`),
        axios.get(`${API_URL}/api/master/prayer-readings`),
      ]);
      setDailyPrayers(dp.data.success ? dp.data.data : []);
      setPrayerReadings(pr.data.success ? pr.data.data : []);
    } catch (err) {
      console.error(err);
      setError('Tidak dapat memuat Bank Materi. Periksa koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const list = activeTab === 'daily-prayers' ? dailyPrayers : prayerReadings;
  const filteredList = list.filter((item) => {
    const q = search.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Materi</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'daily-prayers' && styles.tabChipActive]}
          onPress={() => setActiveTab('daily-prayers')}
        >
          <Text style={[styles.tabChipText, activeTab === 'daily-prayers' && styles.tabChipTextActive]}>Doa Harian</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'prayer-readings' && styles.tabChipActive]}
          onPress={() => setActiveTab('prayer-readings')}
        >
          <Text style={[styles.tabChipText, activeTab === 'prayer-readings' && styles.tabChipTextActive]}>Bacaan Sholat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari materi..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filteredList.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada materi ditemukan.</Text>
          ) : (
            filteredList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ParentMateriDetail', { item, type: activeTab })}
              >
                <View style={[styles.itemIcon, activeTab === 'prayer-readings' && styles.itemIconBlue]}>
                  <Ionicons
                    name={activeTab === 'daily-prayers' ? 'sparkles' : 'book'}
                    size={18}
                    color={activeTab === 'daily-prayers' ? '#D97706' : '#2563EB'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.itemBadgeRow}>
                    {item.category && (
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>{item.category}</Text>
                      </View>
                    )}
                    {item.step_order !== undefined && item.step_order !== null && (
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>Urutan: {item.step_order}</Text>
                      </View>
                    )}
                    {(item.pdf_url || item.external_link) && (
                      <Ionicons name="attach" size={12} color="#9CA3AF" />
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))
          )}
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
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabChipTextActive: {
    color: '#059669',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  itemBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
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
