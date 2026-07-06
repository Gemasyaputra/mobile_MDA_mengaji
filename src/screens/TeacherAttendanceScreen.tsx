import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function TeacherAttendanceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  // History State
  const [mode, setMode] = useState<'input' | 'history'>('input');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterGroupId, setFilterGroupId] = useState<string>('');

  useEffect(() => {
    loadTeacherIdAndClasses();
  }, []);

  useEffect(() => {
    if (mode === 'history' && teacherToken) {
      fetchHistory();
    }
  }, [mode, filterMonth, filterGroupId]);

  const loadTeacherIdAndClasses = async () => {
    try {
      const token = await AsyncStorage.getItem('teacher_token');
      if (token) {
        setTeacherToken(token);
        fetchClasses(token);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.log('Error loading token', e);
      setLoading(false);
    }
  };

  const fetchClasses = async (token: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/mobile/teacher/attendance/list?token=${encodeURIComponent(token)}`);
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching classes', err);
      Alert.alert('Error', 'Gagal memuat daftar kelas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (groupId: number) => {
    if (!teacherToken) return;
    try {
      setLoading(true);
      setSelectedClass(classes.find(c => c.id === groupId));
      const res = await axios.get(`${API_URL}/api/mobile/teacher/attendance/list?token=${encodeURIComponent(teacherToken)}&groupId=${groupId}`);
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching students', err);
      Alert.alert('Error', 'Gagal memuat daftar santri');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!teacherToken) return;
    try {
      setHistoryLoading(true);
      let url = `${API_URL}/api/mobile/teacher/attendance/history?token=${encodeURIComponent(teacherToken)}`;
      if (filterMonth) url += `&month=${filterMonth}`;
      if (filterGroupId) url += `&groupId=${filterGroupId}`;
      
      const res = await axios.get(url);
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching history', err);
      Alert.alert('Error', 'Gagal memuat riwayat presensi');
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateStatus = (id: number, status: string) => {
    setStudents(students.map(student =>
      student.id === id ? { ...student, status } : student
    ));
  };

  const saveAttendance = async () => {
    if (!teacherToken || students.length === 0) return;
    
    setSaving(true);
    try {
      const payload = students.map(s => ({
        studentId: s.id,
        token: teacherToken,
        status: s.status,
        date: new Date().toISOString().split('T')[0]
      }));

      const res = await axios.post(`${API_URL}/api/mobile/teacher/attendance`, payload);
      
      if (res.data.success) {
        Alert.alert('Sukses', 'Presensi berhasil disimpan!');
      } else {
        Alert.alert('Gagal', res.data.message || 'Gagal menyimpan presensi');
      }
    } catch (err) {
      console.log('Error saving attendance', err);
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan presensi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedClass && mode === 'input') {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  // Summary stats for history
  const totalSesi = history.length;
  const totalHadir = history.reduce((sum, h) => sum + Number(h.total_hadir || 0), 0);
  const totalAttendance = history.reduce((sum, h) => sum + Number(h.total_attendance || 0), 0);
  const rataKehadiran = totalAttendance > 0 ? Math.round((totalHadir / totalAttendance) * 100) : 0;

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* For simplicity, we just use the class filter. A month picker in RN needs a custom component or simpler text input */}
        <Text style={styles.filterLabel}>Pilih Kelas:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterGroupScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, filterGroupId === '' && styles.filterChipActive]}
            onPress={() => setFilterGroupId('')}
          >
            <Text style={[styles.filterChipText, filterGroupId === '' && styles.filterChipTextActive]}>Semua</Text>
          </TouchableOpacity>
          {classes.map(c => (
            <TouchableOpacity 
              key={c.id} 
              style={[styles.filterChip, filterGroupId === String(c.id) && styles.filterChipActive]}
              onPress={() => setFilterGroupId(String(c.id))}
            >
              <Text style={[styles.filterChipText, filterGroupId === String(c.id) && styles.filterChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary */}
      {history.length > 0 && (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValueTextEmerald}>{totalSesi}</Text>
            <Text style={styles.summaryLabelEmerald}>Total Sesi</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValueTextBlue}>{rataKehadiran}%</Text>
            <Text style={styles.summaryLabelBlue}>Rata Hadir</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValueTextSlate}>{totalHadir}</Text>
            <Text style={styles.summaryLabelSlate}>Total Hadir</Text>
          </View>
        </View>
      )}

      {historyLoading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada riwayat presensi.</Text>
      ) : (
        <View style={styles.historyList}>
          {history.map((item, idx) => {
            const hadir = Number(item.total_hadir || 0);
            const total = Number(item.total_attendance || 0);
            const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
            const barColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#FBBF24' : '#EF4444';
            const dateStr = new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

            return (
              <View key={idx} style={styles.historyItemCard}>
                <View style={styles.historyItemHeader}>
                  <View>
                    <Text style={styles.historyDateText}>{dateStr}</Text>
                    <Text style={styles.historySubText}>{item.group_name || 'Tanpa Kelas'} • {item.teacher_name || 'Guru'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.historyRatioText, { color: barColor }]}>{hadir}/{total} Hadir</Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if (mode === 'history') {
      return renderHistory();
    }
    if (!selectedClass) {
      return (
        <View style={styles.classSelectionContainer}>
          <Text style={styles.sectionTitle}>Pilih Kelas Anda:</Text>
          {classes.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada kelas yang ditugaskan kepada Anda.</Text>
          ) : (
            classes.map((c, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.classCard}
                onPress={() => fetchStudents(c.id)}
              >
                <View style={styles.classIcon}>
                  <Feather name="users" size={24} color="#059669" />
                </View>
                <Text style={styles.className}>{c.name}</Text>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }
    
    return (
      <View style={styles.attendanceContainer}>
        <View style={styles.selectedClassHeader}>
          <View>
            <Text style={styles.selectedClassLabel}>Kelas Terpilih:</Text>
            <Text style={styles.selectedClassName}>{selectedClass.name}</Text>
          </View>
          <TouchableOpacity onPress={() => { setSelectedClass(null); setStudents([]); }} style={styles.changeClassBtn}>
            <Text style={styles.changeClassText}>Ganti</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateBanner}>
          <Feather name="calendar" size={16} color="#059669" />
          <Text style={styles.dateText}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada santri di kelas ini.</Text>
        ) : (
          <View style={styles.studentsList}>
            {students.map((student, index) => (
              <View key={index} style={styles.studentCard}>
                <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                
                <View style={styles.statusButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.statusBtn, student.status === 'HADIR' && styles.statusBtnActiveHadir]}
                    onPress={() => updateStatus(student.id, 'HADIR')}
                  >
                    <Text style={[styles.statusBtnText, student.status === 'HADIR' && styles.statusBtnTextActive]}>H</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.statusBtn, student.status === 'SAKIT' && styles.statusBtnActiveSakit]}
                    onPress={() => updateStatus(student.id, 'SAKIT')}
                  >
                    <Text style={[styles.statusBtnText, student.status === 'SAKIT' && styles.statusBtnTextActive]}>S</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.statusBtn, student.status === 'IZIN' && styles.statusBtnActiveIzin]}
                    onPress={() => updateStatus(student.id, 'IZIN')}
                  >
                    <Text style={[styles.statusBtnText, student.status === 'IZIN' && styles.statusBtnTextActive]}>I</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.statusBtn, student.status === 'ALFA' && styles.statusBtnActiveAlfa]}
                    onPress={() => updateStatus(student.id, 'ALFA')}
                  >
                    <Text style={[styles.statusBtnText, student.status === 'ALFA' && styles.statusBtnTextActive]}>A</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && students.length > 0 && (
          <TouchableOpacity 
            style={styles.saveBtn}
            onPress={saveAttendance}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Simpan Kehadiran</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Presensi Kelas</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'input' && styles.toggleBtnActive]}
          onPress={() => setMode('input')}
        >
          <Text style={[styles.toggleText, mode === 'input' && styles.toggleTextActive]}>Input Hari Ini</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'history' && styles.toggleBtnActive]}
          onPress={() => setMode('history')}
        >
          <Text style={[styles.toggleText, mode === 'history' && styles.toggleTextActive]}>Riwayat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 15,
  },
  classSelectionContainer: {
    marginTop: 10,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  className: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 30,
    fontStyle: 'italic',
  },
  attendanceContainer: {
    flex: 1,
  },
  selectedClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedClassLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  selectedClassName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  changeClassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  changeClassText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  dateText: {
    marginLeft: 8,
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },
  studentsList: {
    marginBottom: 30,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  studentName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginRight: 10,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  statusBtnActiveHadir: {
    backgroundColor: '#10B981',
  },
  statusBtnActiveSakit: {
    backgroundColor: '#F59E0B',
  },
  statusBtnActiveIzin: {
    backgroundColor: '#3B82F6',
  },
  statusBtnActiveAlfa: {
    backgroundColor: '#EF4444',
  },
  statusBtnTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 15,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#059669',
  },
  historyContainer: {
    flex: 1,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterGroupScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#059669',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryValueTextEmerald: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  summaryLabelEmerald: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  summaryValueTextBlue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  summaryLabelBlue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  summaryValueTextSlate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
  },
  summaryLabelSlate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  historyList: {
    paddingBottom: 20,
  },
  historyItemCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  historySubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  historyRatioText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
