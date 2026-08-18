import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Image } from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function TeacherSantriDetailScreen({ route, navigation }: any) {
  const { studentId, studentName } = route.params;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [learningHistory, setLearningHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('teacher_token');
      const [studentRes, learningRes, attendanceRes] = await Promise.all([
        axios.get(`${API_URL}/api/students?id=${studentId}&token=${encodeURIComponent(token || '')}`),
        axios.get(`${API_URL}/api/learning-records?student_id=${studentId}&limit=10`),
        axios.get(`${API_URL}/api/attendance?student_id=${studentId}`),
      ]);

      if (studentRes.data.success) {
        setStudent(studentRes.data.data);
      }
      if (learningRes.data.success) {
        setLearningHistory(learningRes.data.data || []);
      }
      if (attendanceRes.data.success) {
        setAttendanceHistory(attendanceRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
      CustomAlert.alert('Error', 'Gagal memuat data santri.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpgrade = async () => {
    CustomAlert.alert(
      'Konfirmasi Khatam',
      `Apakah santri ${student?.name} telah menyelesaikan Iqro dan siap lanjut ke Al-Quran?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Lanjut',
          onPress: async () => {
            try {
              setUpgrading(true);
              const token = await AsyncStorage.getItem('teacher_token');
              const res = await axios.patch(`${API_URL}/api/students/${studentId}/upgrade?token=${encodeURIComponent(token || '')}`);
              if (res.data.success) {
                setStudent((prev: any) => ({ ...prev, reading_level: 'ALQURAN' }));
              } else {
                CustomAlert.alert('Gagal', 'Gagal mengupgrade santri.');
              }
            } catch (err) {
              console.error(err);
              CustomAlert.alert('Error', 'Terjadi kesalahan.');
            } finally {
              setUpgrading(false);
            }
          },
        },
      ]
    );
  };

  const handleDowngrade = async () => {
    CustomAlert.alert(
      'Batalkan Status Khatam',
      `Batalkan status khatam santri ${student?.name}? Santri akan kembali berstatus Iqro.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              setDowngrading(true);
              const token = await AsyncStorage.getItem('teacher_token');
              const res = await axios.patch(`${API_URL}/api/students/${studentId}/downgrade?token=${encodeURIComponent(token || '')}`);
              if (res.data.success) {
                setStudent((prev: any) => ({ ...prev, reading_level: 'IQRO' }));
              } else {
                CustomAlert.alert('Gagal', 'Gagal membatalkan status khatam santri.');
              }
            } catch (err) {
              console.error(err);
              CustomAlert.alert('Error', 'Terjadi kesalahan.');
            } finally {
              setDowngrading(false);
            }
          },
        },
      ]
    );
  };

  const openWhatsApp = () => {
    if (!student?.parent_phone) return;
    const phone = student.parent_phone.replace(/\D/g, '');
    const text = `Assalamualaikum, Bapak/Ibu orang tua dari ${student.name}. Berikut kabar perkembangan belajar mengaji ananda.`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`).catch(() => {
      CustomAlert.alert('Error', 'Tidak dapat membuka WhatsApp.');
    });
  };

  const totalHadir = attendanceHistory.filter((a) => a.status?.toUpperCase().trim() === 'HADIR').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{studentName || 'Detail Santri'}</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Santri</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Santri tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{student.name}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            {student.photo_url ? (
              <Image source={{ uri: student.photo_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={32} color="#059669" />
            )}
          </View>
          <Text style={styles.profileName}>{student.name}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              {student.reading_level === 'ALQURAN' ? '📖 Al-Quran' : '📚 Iqro'}
            </Text>
          </View>
          {student.current_level && student.reading_level !== 'ALQURAN' ? (
            <Text style={styles.profileSub}>{student.current_level}</Text>
          ) : null}
          {student.reading_level === 'ALQURAN' && (
            <TouchableOpacity onPress={handleDowngrade} disabled={downgrading} style={styles.undoKhatamLink}>
              {downgrading ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <Text style={styles.undoKhatamLinkText}>↺ Salah konfirmasi? Batalkan khatam</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statValue, { color: '#2563EB' }]}>{totalHadir}</Text>
            <Text style={styles.statLabel}>Total Hadir</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{learningHistory.length}</Text>
            <Text style={styles.statLabel}>Total Mengaji</Text>
          </View>
        </View>

        {/* Parent Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Orang Tua</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NAMA</Text>
            <Text style={styles.infoValue}>{student.parent_name || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NOMOR TELEPON</Text>
            <Text style={styles.infoValue}>{student.parent_phone || '-'}</Text>
          </View>
          {student.address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ALAMAT</Text>
              <Text style={styles.infoValue}>{student.address}</Text>
            </View>
          ) : null}
        </View>

        {/* Learning history */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderFlex}>
            <Text style={styles.sectionTitle}>Riwayat Mengaji</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ParentHistory', { studentId, initialCategory: 'learning' })}>
              <Text style={styles.linkText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          {learningHistory.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada riwayat mengaji.</Text>
          ) : (
            learningHistory.slice(0, 5).map((record) => (
              <View key={record.id} style={styles.recordRow}>
                <View>
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                  <Text style={styles.recordTitle}>
                    {record.type === 'IQRO' ? record.level_or_surah : `QS. ${record.level_or_surah}`}
                  </Text>
                </View>
                <Text style={styles.badge}>Nilai: {record.quality}</Text>
              </View>
            ))
          )}
        </View>

        {/* Quick actions */}
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => navigation.navigate('ParentHistory', { studentId, initialCategory: 'attendance' })}
        >
          <Ionicons name="bar-chart-outline" size={18} color="#334155" />
          <Text style={styles.actionButtonSecondaryText}>Lihat Semua Riwayat</Text>
        </TouchableOpacity>

        {student.parent_phone ? (
          <TouchableOpacity style={styles.actionButtonWA} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonWAText}>Lapor Ortu via WA</Text>
          </TouchableOpacity>
        ) : null}

        {(!student.reading_level || student.reading_level === 'IQRO') && (
          <TouchableOpacity style={styles.actionButtonUpgrade} onPress={handleUpgrade} disabled={upgrading}>
            {upgrading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonUpgradeText}>Khatam Iqro & Lanjut Al-Quran</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  content: { flex: 1 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  levelBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  levelBadgeText: { color: '#2563EB', fontWeight: 'bold', fontSize: 13 },
  profileSub: { fontSize: 12, color: '#64748B', marginTop: 6 },
  undoKhatamLink: { marginTop: 10, padding: 4 },
  undoKhatamLinkText: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textDecorationLine: 'underline' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statTile: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 4 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  sectionHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  linkText: { fontSize: 12, fontWeight: 'bold', color: '#059669' },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1E293B' },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recordDate: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  recordTitle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  badge: { fontSize: 11, color: '#059669', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontWeight: 'bold', overflow: 'hidden' },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12, fontSize: 13 },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionButtonSecondaryText: { color: '#334155', fontWeight: 'bold', fontSize: 14 },
  actionButtonWA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionButtonWAText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  actionButtonUpgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonUpgradeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  errorText: { color: '#DC2626', textAlign: 'center', fontSize: 16 },
});
