import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  ActivityItem,
  ICON_CONFIG,
  TYPE_LABELS,
  buildTeacherMessage,
  formatRelativeTime,
  getDateLabel,
} from '../utils/activityFeed';

const LIMIT_OPTIONS = [20, 50, 100];

export default function TeacherActivityLogScreen({ route, navigation }: any) {
  const { teacherId } = route.params;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [showLimitMenu, setShowLimitMenu] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/api/dashboard/activity?role=teacher&teacher_id=${teacherId}&limit=${limit}`);
      if (res.data.success) {
        setActivities(res.data.data || []);
      } else {
        setError(res.data.message || 'Gagal memuat log aktivitas.');
      }
    } catch (err) {
      console.error(err);
      setError('Tidak dapat memuat log aktivitas. Periksa koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [teacherId, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = useMemo(() => {
    let result = activities;
    if (selectedType !== 'all') {
      result = result.filter((a) => a.type === selectedType);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.actor_name?.toLowerCase().includes(q) ||
          a.student_name?.toLowerCase().includes(q) ||
          a.group_name?.toLowerCase().includes(q) ||
          a.detail?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activities, selectedType, search]);

  const groups = useMemo(() => {
    const list: { label: string; items: ActivityItem[] }[] = [];
    filtered.forEach((item) => {
      const label = getDateLabel(item.ts);
      const existing = list.find((g) => g.label === label);
      if (existing) {
        existing.items.push(item);
      } else {
        list.push({ label, items: [item] });
      }
    });
    return list;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Log Aktivitas</Text>
          <Text style={styles.headerSubtitle}>Aktivitas seputar kelas yang Anda ajar</Text>
        </View>
        <TouchableOpacity onPress={fetchActivities} disabled={loading} style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" style={loading ? { opacity: 0.5 } : undefined} />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama santri, kelas..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
        <View>
          <TouchableOpacity style={styles.limitButton} onPress={() => setShowLimitMenu((v) => !v)}>
            <Text style={styles.limitButtonText}>{limit}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>
          {showLimitMenu && (
            <View style={styles.limitDropdown}>
              {LIMIT_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.limitItem}
                  onPress={() => {
                    setLimit(n);
                    setShowLimitMenu(false);
                  }}
                >
                  <Text style={[styles.limitItemText, limit === n && styles.limitItemTextActive]}>{n} item</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.pill, selectedType === key && styles.pillActive]}
            onPress={() => setSelectedType(key)}
          >
            <Text style={[styles.pillText, selectedType === key && styles.pillTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={36} color="#CBD5E1" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="pulse-outline" size={36} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Tidak ada aktivitas ditemukan</Text>
          <Text style={styles.emptyText}>Coba ubah filter atau kata kunci pencarian.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {groups.map((group) => (
            <View key={group.label} style={{ marginBottom: 20 }}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
                <View style={styles.groupDivider} />
                <Text style={styles.groupCount}>{group.items.length} aktivitas</Text>
              </View>

              <View style={styles.groupCard}>
                {group.items.map((item, idx) => {
                  const config = ICON_CONFIG[item.type] || ICON_CONFIG.attendance;
                  const segments = buildTeacherMessage(item);
                  const timeLabel = item.ts ? formatRelativeTime(item.ts) : '';
                  return (
                    <View key={idx} style={[styles.activityRow, idx > 0 && styles.activityRowBorder]}>
                      <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon as any} size={17} color={config.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityText}>
                          {segments.map((seg, si) => (
                            <Text
                              key={si}
                              style={[
                                seg.bold && styles.activityTextBold,
                                seg.amber && { color: '#D97706' },
                              ]}
                            >
                              {seg.text}
                            </Text>
                          ))}
                        </Text>
                        <View style={styles.activityMetaRow}>
                          {timeLabel ? <Text style={styles.activityTime}>{timeLabel}</Text> : null}
                          <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                            <Text style={[styles.typeBadgeText, { color: config.color }]}>
                              {TYPE_LABELS[item.type] || item.type}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={styles.summaryText}>
            Menampilkan {filtered.length} dari {activities.length} aktivitas (limit {limit})
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
    gap: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#D1FAE5', marginTop: 1 },
  refreshButton: { padding: 6 },
  controlsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0 },
  limitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  limitButtonText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  limitDropdown: {
    position: 'absolute',
    right: 0,
    top: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  limitItem: { paddingHorizontal: 16, paddingVertical: 10 },
  limitItemText: { fontSize: 13, color: '#334155' },
  limitItemTextActive: { color: '#059669', fontWeight: 'bold' },
  pillsRow: { flexGrow: 0, marginBottom: 10 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: { backgroundColor: '#059669', borderColor: '#059669' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  pillTextActive: { color: '#FFFFFF' },
  content: { flex: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  groupLabel: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 0.5 },
  groupDivider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  groupCount: { fontSize: 10, color: '#94A3B8' },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityRow: { flexDirection: 'row', gap: 12, padding: 14 },
  activityRowBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  activityText: { fontSize: 13, color: '#475569', lineHeight: 19 },
  activityTextBold: { fontWeight: 'bold', color: '#1E293B' },
  activityMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  activityTime: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  emptyTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginTop: 12 },
  emptyText: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  errorText: { color: '#DC2626', textAlign: 'center', marginTop: 12, marginBottom: 16, fontSize: 14 },
  retryButton: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  summaryText: { textAlign: 'center', fontSize: 11, color: '#94A3B8', paddingVertical: 8 },
});
