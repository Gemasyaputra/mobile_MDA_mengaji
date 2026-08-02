import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Platform, Modal, Image } from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';
import { toLocalDateString } from '../utils/date';

const STATUS_LABEL: Record<string, string> = { HADIR: 'Hadir', ALFA: 'Alfa', SAKIT: 'Sakit', IZIN: 'Izin' };

const STATUS_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  HADIR: { bg: '#D1FAE5', text: '#059669' },
  SAKIT: { bg: '#FEF3C7', text: '#B45309' },
  IZIN: { bg: '#DBEAFE', text: '#1D4ED8' },
  ALFA: { bg: '#FEE2E2', text: '#DC2626' },
  default: { bg: '#F1F5F9', text: '#94A3B8' },
};

export default function TeacherAttendanceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [session, setSession] = useState<'PAGI' | 'SIANG' | 'SORE'>('PAGI');
  const [attendanceTime, setAttendanceTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // History State
  const [mode, setMode] = useState<'input' | 'history'>('input');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterGroupId, setFilterGroupId] = useState<string>('');

  // Detail hari (dibuka saat kartu riwayat di-tap): daftar santri + status per sesi
  // untuk satu tanggal+kelas, dari endpoint yang sama dipakai mode Input.
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDay, setDetailDay] = useState<any>(null);
  const [detailStudents, setDetailStudents] = useState<any[]>([]);

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
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.log('Error fetching classes', err);
        CustomAlert.alert('Error', 'Gagal memuat daftar kelas');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (groupId: number, sessionOverride?: 'PAGI' | 'SIANG' | 'SORE', dateOverride?: string) => {
    if (!teacherToken) return;
    try {
      setLoading(true);
      setSelectedClass(classes.find(c => c.id === groupId));
      const activeSession = sessionOverride || session;
      const effectiveDate = dateOverride || date;
      const res = await axios.get(`${API_URL}/api/mobile/teacher/attendance/list?token=${encodeURIComponent(teacherToken)}&groupId=${groupId}&session=${activeSession}&date=${effectiveDate}`);
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.log('Error fetching students', err);
        CustomAlert.alert('Error', 'Gagal memuat daftar santri');
      }
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const newDate = toLocalDateString(d);
    setDate(newDate);
    if (selectedClass) fetchStudents(selectedClass.id, session, newDate);
  };

  const goToToday = () => {
    const todayStr = toLocalDateString(new Date());
    setDate(todayStr);
    if (selectedClass) fetchStudents(selectedClass.id, session, todayStr);
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      const newDate = toLocalDateString(selected);
      setDate(newDate);
      if (selectedClass) fetchStudents(selectedClass.id, session, newDate);
    }
  };

  const isToday = date === toLocalDateString(new Date());
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const changeSession = (newSession: 'PAGI' | 'SIANG' | 'SORE') => {
    setSession(newSession);
    if (selectedClass) fetchStudents(selectedClass.id, newSession, date);
  };

  const changeMonth = (delta: number) => {
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();
    if (newMonth > currentMonth) return;
    setFilterMonth(newMonth);
  };

  const isCurrentMonth = filterMonth === (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const formattedMonth = (() => {
    const [y, m] = filterMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  })();

  const openDayDetail = async (item: any) => {
    setDetailDay(item);
    setDetailVisible(true);
    setDetailStudents([]);
    if (!teacherToken) return;
    try {
      setDetailLoading(true);
      const res = await axios.get(`${API_URL}/api/mobile/teacher/attendance/list?token=${encodeURIComponent(teacherToken)}&groupId=${item.group_id}&date=${item.date}`);
      if (res.data.success) {
        setDetailStudents(res.data.data);
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.log('Error fetching day detail', err);
        CustomAlert.alert('Error', 'Gagal memuat detail presensi tanggal ini');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Endpoint detail selalu mengembalikan status untuk sesi PAGI di field `status`, dan sesi
  // lain (SIANG/SORE) di `otherSessions` — gabungkan jadi satu peta {PAGI, SIANG, SORE} per
  // santri supaya gampang dirender.
  const studentSessionStatuses = (student: any): Record<string, string | null> => {
    const map: Record<string, string | null> = { PAGI: student.status || null, SIANG: null, SORE: null };
    (student.otherSessions || []).forEach((o: any) => { map[o.session] = o.status; });
    return map;
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
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.log('Error fetching history', err);
        CustomAlert.alert('Error', 'Gagal memuat riwayat presensi');
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateStatus = (id: number, status: string) => {
    setStudents(students.map(student =>
      student.id === id ? { ...student, status } : student
    ));
  };

  // Santri yang sudah tercatat di sesi lain hari ini sudah "beres" untuk hari itu — jangan
  // ikut dihitung/diperingatkan sebagai "belum ditandai" untuk sesi yang sedang dibuka.
  const needsMarking = (student: any) => !student.status && !(student.otherSessions && student.otherSessions.length > 0);

  const saveAttendance = async () => {
    if (!teacherToken || students.length === 0) return;

    const markedStudents = students.filter(s => s.status);
    const unmarkedStudents = students.filter(needsMarking);
    const unmarkedCount = unmarkedStudents.length;

    if (markedStudents.length === 0) {
      CustomAlert.alert('Belum ada data', 'Belum ada santri yang ditandai statusnya.');
      return;
    }

    if (unmarkedCount > 0) {
      CustomAlert.alert(
        'Ada santri belum ditandai',
        `${unmarkedCount} santri belum ditandai statusnya untuk sesi ${session === 'SIANG' ? 'Siang' : session === 'SORE' ? 'Sore' : 'Pagi'} dan tidak akan disimpan. Lanjutkan simpan untuk ${markedStudents.length} santri yang sudah ditandai?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjutkan', onPress: () => doSaveAttendance(markedStudents) },
        ]
      );
      return;
    }

    doSaveAttendance(markedStudents);
  };

  const doSaveAttendance = async (markedStudents: any[]) => {
    setSaving(true);
    try {
      const now = new Date();
      const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setAttendanceTime(timeNow);
      const payload = markedStudents.map(s => ({
        studentId: s.id,
        token: teacherToken,
        status: s.status,
        session,
        time: timeNow,
        date,
      }));

      const res = await axios.post(`${API_URL}/api/mobile/teacher/attendance`, payload);

      if (res.data.success) {
        CustomAlert.alert('Sukses', 'Presensi berhasil disimpan!');
      } else {
        CustomAlert.alert('Gagal', res.data.message || 'Gagal menyimpan presensi');
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.log('Error saving attendance', err);
        CustomAlert.alert('Error', 'Terjadi kesalahan saat menyimpan presensi');
      }
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

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <View style={styles.monthNavRow}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
          <Feather name="chevron-left" size={20} color="#059669" />
        </TouchableOpacity>
        <View style={styles.monthNavCenter}>
          <Feather name="calendar" size={14} color="#059669" />
          <Text style={styles.monthNavText} numberOfLines={1}>{formattedMonth}</Text>
        </View>
        <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(1)} disabled={isCurrentMonth}>
          <Feather name="chevron-right" size={20} color={isCurrentMonth ? '#CBD5E1' : '#059669'} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
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

      {historyLoading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada riwayat presensi.</Text>
      ) : (
        <View style={styles.historyList}>
          {history.map((item, idx) => {
            const totalSantri = Number(item.total_students || 0);
            const dateStr = new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
            const sessions = (item.sessions || []) as { session: string; total_attendance: number; total_hadir: number }[];
            const hadirFor = (name: string) => sessions.find((s) => s.session === name)?.total_hadir ?? null;
            const nonHadir = [
              { label: 'Alfa', count: Number(item.total_alfa || 0), color: '#EF4444' },
              { label: 'Sakit', count: Number(item.total_sakit || 0), color: '#F59E0B' },
              { label: 'Izin', count: Number(item.total_izin || 0), color: '#3B82F6' },
            ].filter((s) => s.count > 0);

            return (
              <TouchableOpacity key={idx} style={styles.historyItemCard} activeOpacity={0.7} onPress={() => openDayDetail(item)}>
                <View style={styles.historyItemHeader}>
                  <View>
                    <Text style={styles.historyDateText}>{dateStr}</Text>
                    <Text style={styles.historySubText}>{item.group_name || 'Tanpa Kelas'} • {item.teacher_name || 'Guru'}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#CBD5E1" />
                </View>

                <Text style={styles.totalSantriText}>Total Santri: {totalSantri}</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(['PAGI', 'SIANG', 'SORE'] as const).map((name) => {
                    const hadir = hadirFor(name);
                    const label = name === 'PAGI' ? 'Pagi' : name === 'SIANG' ? 'Siang' : 'Sore';
                    return (
                      <View
                        key={name}
                        style={[
                          styles.sessionBadge,
                          name === 'SIANG' && styles.sessionBadgeSiang,
                          name === 'SORE' && styles.sessionBadgeSore,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionBadgeText,
                            name === 'SIANG' && styles.sessionBadgeTextSiang,
                            name === 'SORE' && styles.sessionBadgeTextSore,
                          ]}
                        >
                          {label}: {hadir !== null ? `${hadir}/${totalSantri}` : '-'}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {nonHadir.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {nonHadir.map((s) => (
                      <Text key={s.label} style={[styles.nonHadirText, { color: s.color }]}>{s.label}: {s.count}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderDayDetailModal = () => (
    <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {detailDay ? new Date(detailDay.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              </Text>
              <Text style={styles.historySubText}>{detailDay?.group_name || 'Tanpa Kelas'}</Text>
            </View>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ padding: 4 }}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {detailStudents.map((student) => {
                const statuses = studentSessionStatuses(student);
                return (
                  <View key={student.id} style={styles.detailStudentRow}>
                    <Text style={styles.detailStudentName} numberOfLines={1}>{student.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['PAGI', 'SIANG', 'SORE'] as const).map((name) => {
                        const st = statuses[name];
                        const colors = STATUS_CHIP_COLORS[st || ''] || STATUS_CHIP_COLORS.default;
                        return (
                          <View key={name} style={[styles.detailStatusChip, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.detailStatusChipText, { color: colors.text }]}>
                              {st ? (STATUS_LABEL[st]?.[0] ?? st[0]) : '-'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.detailLegendRow}>
            <Text style={styles.detailLegendText}>Urutan chip: Pagi • Siang • Sore — H Hadir, S Sakit, I Izin, A Alfa, - Belum ditandai</Text>
          </View>
        </View>
      </View>
    </Modal>
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

        <View style={styles.dateNavRow}>
          <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
            <Feather name="chevron-left" size={20} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateNavCenter} onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={14} color="#059669" />
            <Text style={styles.dateNavText} numberOfLines={1}>{formattedDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)} disabled={isToday}>
            <Feather name="chevron-right" size={20} color={isToday ? '#CBD5E1' : '#059669'} />
          </TouchableOpacity>
        </View>
        {!isToday && (
          <TouchableOpacity style={styles.todayChip} onPress={goToToday}>
            <Text style={styles.todayChipText}>Kembali ke Hari Ini</Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date + 'T00:00:00')}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        <View style={styles.sessionToggleContainer}>
          <TouchableOpacity
            style={[styles.sessionToggleBtn, session === 'PAGI' && styles.sessionToggleBtnActive]}
            onPress={() => changeSession('PAGI')}
          >
            <Text style={[styles.sessionToggleText, session === 'PAGI' && styles.sessionToggleTextActive]}>Pagi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sessionToggleBtn, session === 'SIANG' && styles.sessionToggleBtnActive]}
            onPress={() => changeSession('SIANG')}
          >
            <Text style={[styles.sessionToggleText, session === 'SIANG' && styles.sessionToggleTextActive]}>Siang</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sessionToggleBtn, session === 'SORE' && styles.sessionToggleBtnActive]}
            onPress={() => changeSession('SORE')}
          >
            <Text style={[styles.sessionToggleText, session === 'SORE' && styles.sessionToggleTextActive]}>Sore</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada santri di kelas ini.</Text>
        ) : (
          <>
          {students.some(s => s.otherSessions && s.otherSessions.length > 0) && (
            <View style={styles.otherSessionsBanner}>
              <Text style={styles.otherSessionsBannerText}>
                ℹ {students.filter(s => s.otherSessions && s.otherSessions.length > 0).length} santri sudah tercatat di sesi lain pada tanggal ini
              </Text>
            </View>
          )}
          <View style={styles.studentsList}>
            {students.map((student, index) => (
              <View key={index} style={styles.studentCard}>
                {student.photoUrl ? (
                  <Image source={{ uri: student.photoUrl }} style={styles.studentAvatar} resizeMode="cover" />
                ) : (
                  <View style={styles.studentAvatarPlaceholder}>
                    <Text style={styles.studentAvatarPlaceholderText}>{student.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  {!!student.time && (
                    <Text style={styles.studentTimeText}>Jam {student.time}</Text>
                  )}
                  {needsMarking(student) && (
                    <View style={styles.unmarkedBadge}>
                      <Text style={styles.unmarkedBadgeText}>Belum ditandai</Text>
                    </View>
                  )}
                  {student.otherSessions && student.otherSessions.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {student.otherSessions.map((o: any, i: number) => (
                        <View
                          key={i}
                          style={[
                            styles.sessionBadge,
                            o.session === 'SIANG' && styles.sessionBadgeSiang,
                            o.session === 'SORE' && styles.sessionBadgeSore,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sessionBadgeText,
                              o.session === 'SIANG' && styles.sessionBadgeTextSiang,
                              o.session === 'SORE' && styles.sessionBadgeTextSore,
                            ]}
                          >
                            ✓ {o.session === 'SIANG' ? 'Siang' : o.session === 'SORE' ? 'Sore' : 'Pagi'}: {STATUS_LABEL[o.status] || o.status}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

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
          </>
        )}

        {!loading && students.length > 0 && students.some(needsMarking) && (
          <Text style={styles.unmarkedSummaryText}>
            ⚠ {students.filter(needsMarking).length} santri belum ditandai statusnya
          </Text>
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
          <Text style={[styles.toggleText, mode === 'input' && styles.toggleTextActive]}>Input Presensi</Text>
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

      {renderDayDetailModal()}
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
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dateNavBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dateNavCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
  },
  dateNavText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  todayChip: {
    alignSelf: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  sessionToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 10,
    marginBottom: 20,
  },
  sessionToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  sessionToggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionToggleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  sessionToggleTextActive: {
    color: '#059669',
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
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  studentAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  studentAvatarPlaceholderText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#059669',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  studentTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
  unmarkedBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  unmarkedBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
  unmarkedSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    textAlign: 'center',
    marginBottom: 10,
  },
  otherSessionsBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  otherSessionsBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
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
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  monthNavBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  monthNavCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
  },
  monthNavText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
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
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  totalSantriText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  nonHadirText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  detailStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailStudentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginRight: 10,
  },
  detailStatusChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailStatusChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailLegendRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailLegendText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  historySubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
  },
  sessionBadgeSiang: {
    backgroundColor: '#FEF3C7',
  },
  sessionBadgeSore: {
    backgroundColor: '#EDE9FE',
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  sessionBadgeTextSiang: {
    color: '#B45309',
  },
  sessionBadgeTextSore: {
    color: '#6D28D9',
  },
});
