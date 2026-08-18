import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Image } from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';
import { toLocalDateString } from '../utils/date';

const SALAT_FARDU_OPTIONS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
const SALAT_SUNAH_OPTIONS = ['Salat Jumat', 'Salat Duha', 'Salat Tahajud', 'Salat Rawatib'];

export default function TeacherInputIbadahScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  // Form State
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState<'SALAT_FARDU' | 'SALAT_SUNAH'>('SALAT_FARDU');
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('teacher_token');
      if (token) {
        setTeacherToken(token);
        fetchClasses(token);
        try {
          const meRes = await axios.get(`${API_URL}/api/mobile/teacher/me?token=${encodeURIComponent(token)}`);
          if (meRes.data.success) {
            setTeacherId(meRes.data.data.id);
          }
        } catch (e) {
          console.log('Error resolving teacher id', e);
        }
      }
    } catch (e) {
      console.log('Error init data', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/mobile/teacher/attendance/list?token=${encodeURIComponent(token)}`);
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) console.log('Error fetching classes', err);
    }
  };

  const fetchStudents = async (c: any, dateOverride?: string) => {
    if (!teacherToken) return;
    const effectiveDate = dateOverride || date;
    try {
      setLoading(true);
      setSelectedClass(c);
      setStep(2);

      const res = await axios.get(`${API_URL}/api/mobile/teacher/attendance/list?token=${encodeURIComponent(teacherToken)}&groupId=${c.id}`);
      if (res.data.success) {
        const studentList = res.data.data;
        setStudents(studentList);

        // Fetch records untuk tanggal yang dipilih
        if (studentList.length > 0) {
          const ids = studentList.map((s: any) => s.id).join(',');
          const recRes = await axios.get(`${API_URL}/api/worship-records?group_student_ids=${ids}&date=${effectiveDate}`);
          if (recRes.data.success) {
            setTodayRecords(recRes.data.data.filter((r: any) => r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH'));
          }
        } else {
          setTodayRecords([]);
        }
      }
    } catch (err) {
      console.log('Error fetching students', err);
      CustomAlert.alert('Error', 'Gagal memuat daftar santri');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const newDate = toLocalDateString(d);
    setDate(newDate);
    if (selectedClass) fetchStudents(selectedClass, newDate);
  };

  const goToToday = () => {
    const todayStr = toLocalDateString(new Date());
    setDate(todayStr);
    if (selectedClass) fetchStudents(selectedClass, todayStr);
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      const newDate = toLocalDateString(selected);
      setDate(newDate);
      if (selectedClass) fetchStudents(selectedClass, newDate);
    }
  };

  const isToday = date === toLocalDateString(new Date());
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleStudentSelect = async (student: any) => {
    setSelectedStudent(student);
    setType('SALAT_FARDU');
    setSelectedPrayers([]);
    setStep(3);

    try {
      setLoading(true);
      const recentRes = await axios.get(`${API_URL}/api/worship-records?student_id=${student.id}&limit=10`);
      if (recentRes.data.success) {
        setRecentRecords(recentRes.data.data.filter((r: any) => r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH'));
      }
    } catch (err) {
      console.log('Error fetching recent', err);
    } finally {
      setLoading(false);
    }
  };

  // Salat yang sudah tercatat pada tanggal terpilih untuk santri & kategori yang sedang dibuka
  const alreadyRecordedForDate = selectedStudent
    ? todayRecords
        .filter(r => Number(r.student_id) === Number(selectedStudent.id) && r.type === type)
        .map(r => r.prayer_name)
    : [];

  const togglePrayer = (name: string) => {
    if (alreadyRecordedForDate.includes(name)) return; // sudah tercatat pada tanggal ini, tidak bisa diubah dari sini
    setSelectedPrayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const saveRecord = async () => {
    if (!selectedStudent || !teacherToken) return;
    const toSave = selectedPrayers.filter(p => !alreadyRecordedForDate.includes(p));
    if (toSave.length === 0) {
      CustomAlert.alert('Peringatan', 'Silakan centang minimal satu salat yang belum dicatat pada tanggal ini.');
      return;
    }
    if (!teacherId) {
      CustomAlert.alert('Error', 'Sesi guru tidak valid. Silakan login ulang.');
      return;
    }

    setSaving(true);
    try {
      const savedPayloads: any[] = [];
      for (const prayer of toSave) {
        const payload = {
          student_id: selectedStudent.id,
          teacher_id: teacherId,
          date: date,
          type: type,
          daily_prayer_id: null,
          prayer_reading_id: null,
          prayer_name: prayer,
          is_completed: true,
          quality: null,
          notes: null,
          token: teacherToken
        };
        const res = await axios.post(`${API_URL}/api/worship-records`, payload);
        if (res.data.success) {
          savedPayloads.push(payload);
        }
      }

      if (savedPayloads.length > 0) {
        CustomAlert.alert('Sukses', `${savedPayloads.length} catatan salat berhasil disimpan!`);
        setTodayRecords(prev => [...prev, ...savedPayloads]);
        setRecentRecords(prev => [...savedPayloads, ...prev]);
        setStep(2);
        setSelectedStudent(null);
      } else {
        CustomAlert.alert('Gagal', 'Gagal menyimpan catatan');
      }
    } catch (err: any) {
      console.log('Error saving worship', err);
      CustomAlert.alert('Error', err.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const getStudentTodayRecords = (id: number) => todayRecords.filter(r => Number(r.student_id) === Number(id));
  const doneCount = students.filter(s => getStudentTodayRecords(s.id).length > 0).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep((s) => (s - 1) as any) : navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Pilih Kelas' : step === 2 ? 'Pilih Santri' : 'Catat Ibadah'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Pilih Kelas Anda:</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#059669" />
            ) : classes.length === 0 ? (
              <Text style={styles.emptyText}>Tidak ada kelas.</Text>
            ) : (
              classes.map((c, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.cardBtn}
                  onPress={() => fetchStudents(c)}
                >
                  <View style={styles.iconBox}><Feather name="sunrise" size={24} color="#D97706" /></View>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {step === 2 && selectedClass && (
          <View>
            <View style={styles.dateNavRow}>
              <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
                <Feather name="chevron-left" size={20} color="#D97706" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateNavCenter} onPress={() => setShowDatePicker(true)}>
                <Feather name="calendar" size={14} color="#D97706" />
                <Text style={styles.dateNavText} numberOfLines={1}>{formattedDate}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)} disabled={isToday}>
                <Feather name="chevron-right" size={20} color={isToday ? '#CBD5E1' : '#D97706'} />
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

            <View style={styles.infoBanner}>
              <View>
                <Text style={styles.infoLabel}>Kelas Terpilih</Text>
                <Text style={styles.infoValue}>{selectedClass.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.infoValueEmerald}>{doneCount}/{students.length}</Text>
                <Text style={styles.infoLabel}>sudah diisi</Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} />
            ) : students.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada santri di kelas ini.</Text>
            ) : (
              students.map((student, index) => {
                const todayRecs = getStudentTodayRecords(student.id);
                const isDone = todayRecs.length > 0;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.studentCard, isDone && styles.studentCardDone]}
                    onPress={() => handleStudentSelect(student)}
                  >
                    <View style={[styles.avatar, isDone ? styles.avatarDone : styles.avatarPending]}>
                      {student.photoUrl ? (
                        <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                      ) : isDone ? (
                        <Feather name="check" size={20} color="white" />
                      ) : (
                        <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                      )}
                      {student.photoUrl && isDone && (
                        <View style={styles.avatarDoneBadge}>
                          <Feather name="check" size={9} color="white" />
                        </View>
                      )}
                    </View>

                    <View style={styles.studentInfoBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                        {isDone && <View style={styles.badgeDone}><Text style={styles.badgeDoneText}>{todayRecs.length} dicatat</Text></View>}
                      </View>

                      {isDone ? (
                        <Text style={styles.studentSubTextDone} numberOfLines={1}>{todayRecs.map(r => r.prayer_name).join(', ')}</Text>
                      ) : (
                        <Text style={styles.studentSubTextPending}>
                          <Text style={{ color: '#F59E0B' }}>Belum diisi</Text>
                        </Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={20} color={isDone ? '#34D399' : '#CBD5E1'} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {step === 3 && selectedStudent && (
          <View>
            <View style={styles.studentHeaderCard}>
              <Text style={styles.studentHeaderTitle}>{selectedStudent.name}</Text>
              <Text style={styles.studentHeaderSub}>Ibadah — Salat Fardu / Sunah</Text>
              <Text style={styles.studentHeaderDate}>{formattedDate}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Jenis Salat</Text>
                <View style={styles.rowBtnContainer}>
                  <TouchableOpacity
                    style={[styles.radioBtn, type === 'SALAT_FARDU' && styles.radioBtnActive]}
                    onPress={() => { setType('SALAT_FARDU'); setSelectedPrayers([]); }}
                  >
                    <Text style={[styles.radioText, type === 'SALAT_FARDU' && styles.radioTextActive]}>Salat Fardu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, type === 'SALAT_SUNAH' && styles.radioBtnActive]}
                    onPress={() => { setType('SALAT_SUNAH'); setSelectedPrayers([]); }}
                  >
                    <Text style={[styles.radioText, type === 'SALAT_SUNAH' && styles.radioTextActive]}>Salat Sunah</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Centang Salat yang Sudah Dilaksanakan</Text>
                <View style={styles.checklistGrid}>
                  {(type === 'SALAT_FARDU' ? SALAT_FARDU_OPTIONS : SALAT_SUNAH_OPTIONS).map((item) => {
                    const isLocked = alreadyRecordedForDate.includes(item);
                    const isChecked = isLocked || selectedPrayers.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.checklistItem,
                          isChecked && styles.checklistItemActive,
                          isLocked && styles.checklistItemLocked,
                        ]}
                        onPress={() => togglePrayer(item)}
                        disabled={isLocked}
                      >
                        <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                          {isChecked && <Feather name="check" size={14} color="#fff" />}
                        </View>
                        <Text style={[styles.checklistItemText, isChecked && styles.checklistItemTextActive]}>
                          {item}
                        </Text>
                        {isLocked && <Text style={styles.checklistLockedText}>Sudah</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveRecord}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {selectedPrayers.filter(p => !alreadyRecordedForDate.includes(p)).length > 0
                      ? `Simpan ${selectedPrayers.filter(p => !alreadyRecordedForDate.includes(p)).length} Salat`
                      : 'Simpan Ibadah'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Recent Records */}
            {recentRecords.length > 0 && (
              <View style={styles.recentContainer}>
                <Text style={styles.recentTitle}>Riwayat Terakhir</Text>
                {recentRecords.map((r, i) => {
                  const byParent = r.recorded_by === 'PARENT';
                  return (
                    <View key={i} style={styles.recentItem}>
                      <View>
                        <Text style={styles.recentItemText}>{r.prayer_name}</Text>
                        <Text style={styles.recentItemDate}>{new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.recordedByBadge, byParent && styles.recordedByBadgeParent]}>
                          <Text style={[styles.recordedByBadgeText, byParent && styles.recordedByBadgeTextParent]}>
                            {byParent ? 'Ortu' : 'Guru'}
                          </Text>
                        </View>
                        <Feather name="check-circle" size={16} color="#10B981" />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardTitle: {
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
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D97706',
  },
  studentHeaderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  infoLabel: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginTop: 4,
  },
  infoValueEmerald: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D97706',
    marginTop: 4,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  studentCardDone: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'visible',
  },
  avatarPending: {
    backgroundColor: '#F1F5F9',
  },
  avatarDone: {
    backgroundColor: '#D97706',
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#64748B',
    fontSize: 16,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarDoneBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfoBox: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  badgeDone: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeDoneText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D97706',
  },
  studentSubTextPending: {
    fontSize: 14,
    marginTop: 4,
  },
  studentSubTextDone: {
    fontSize: 14,
    color: '#D97706',
    marginTop: 4,
  },
  studentHeaderCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  studentHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  studentHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowBtnContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  radioBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioBtnActive: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  radioText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#D97706',
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  checklistItemActive: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  checklistItemLocked: {
    opacity: 0.7,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  checklistItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  checklistItemTextActive: {
    color: '#92400E',
  },
  checklistLockedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
  },
  saveBtn: {
    backgroundColor: '#D97706',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recentContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  recentItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  recentItemDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  recordedByBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recordedByBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
  },
  recordedByBadgeParent: {
    backgroundColor: '#FEF3C7',
  },
  recordedByBadgeTextParent: {
    color: '#B45309',
  },
});
