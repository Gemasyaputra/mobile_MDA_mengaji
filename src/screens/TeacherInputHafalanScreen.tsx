import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, TextInput, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';

export default function TeacherInputHafalanScreen({ navigation }: any) {
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
  
  // Master Data
  const [dailyPrayers, setDailyPrayers] = useState<any[]>([]);
  const [prayerReadings, setPrayerReadings] = useState<any[]>([]);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState('DOA_HARIAN'); // DOA_HARIAN or BACAAN_SHOLAT
  const [selectedItem, setSelectedItem] = useState<any>(null); // from master data
  const [isCompleted, setIsCompleted] = useState(false);
  const [quality, setQuality] = useState('A');
  const [notes, setNotes] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);

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

      // Fetch Master Data
      const dpRes = await axios.get(`${API_URL}/api/master/daily-prayers`);
      if (dpRes.data.success) {
        setDailyPrayers(dpRes.data.data);
      }
      const prRes = await axios.get(`${API_URL}/api/master/prayer-readings`);
      if (prRes.data.success) {
        setPrayerReadings(prRes.data.data);
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
            setTodayRecords(recRes.data.data.filter((r: any) => r.type === 'DOA_HARIAN' || r.type === 'BACAAN_SHOLAT'));
          }
        } else {
          setTodayRecords([]);
        }
      }
    } catch (err) {
      console.log('Error fetching students', err);
      Alert.alert('Error', 'Gagal memuat daftar santri');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split('T')[0];
    setDate(newDate);
    if (selectedClass) fetchStudents(selectedClass, newDate);
  };

  const goToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setDate(todayStr);
    if (selectedClass) fetchStudents(selectedClass, todayStr);
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      const newDate = selected.toISOString().split('T')[0];
      setDate(newDate);
      if (selectedClass) fetchStudents(selectedClass, newDate);
    }
  };

  const isToday = date === new Date().toISOString().split('T')[0];
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleStudentSelect = async (student: any) => {
    setSelectedStudent(student);
    setType('DOA_HARIAN');
    setSelectedItem(null);
    setIsCompleted(false);
    setQuality('A');
    setNotes('');
    setStep(3);

    try {
      setLoading(true);
      const recentRes = await axios.get(`${API_URL}/api/worship-records?student_id=${student.id}&limit=10`);
      if (recentRes.data.success) {
        setRecentRecords(recentRes.data.data.filter((r: any) => r.type === 'DOA_HARIAN' || r.type === 'BACAAN_SHOLAT').slice(0, 5));
      }
    } catch (err) {
      console.log('Error fetching recent', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRecord = async () => {
    if (!selectedStudent || !teacherToken) return;
    if (!selectedItem) {
      Alert.alert('Peringatan', 'Silakan pilih Doa/Bacaan terlebih dahulu.');
      return;
    }
    if (!teacherId) {
      Alert.alert('Error', 'Sesi guru tidak valid. Silakan login ulang.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        student_id: selectedStudent.id,
        teacher_id: teacherId,
        date: date,
        type: type,
        daily_prayer_id: type === 'DOA_HARIAN' ? selectedItem.id : null,
        prayer_reading_id: type === 'BACAAN_SHOLAT' ? selectedItem.id : null,
        is_completed: isCompleted,
        quality: quality,
        notes: notes
      };

      const res = await axios.post(`${API_URL}/api/worship-records`, payload);

      if (res.data.success) {
        Alert.alert('Sukses', 'Catatan hafalan berhasil disimpan!');

        // Enhance payload for local display
        const localPayload = {
          ...payload,
          daily_prayer_title: type === 'DOA_HARIAN' ? selectedItem.title : null,
          prayer_reading_title: type === 'BACAAN_SHOLAT' ? selectedItem.title : null
        };

        setTodayRecords(prev => [...prev.filter(r => r.student_id !== selectedStudent.id), localPayload]);
        setStep(2);
        setSelectedStudent(null);
      } else {
        Alert.alert('Gagal', res.data.message || 'Gagal menyimpan catatan');
      }
    } catch (err: any) {
      console.log('Error saving worship', err);
      Alert.alert('Error', err.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const getStudentTodayRecord = (id: number) => todayRecords.find(r => Number(r.student_id) === Number(id));
  const doneCount = students.filter(s => getStudentTodayRecord(s.id)).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep((s) => (s - 1) as any) : navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Pilih Kelas' : step === 2 ? 'Pilih Santri' : 'Catat Hafalan'}
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
                  <View style={styles.iconBox}><Feather name="book" size={24} color="#059669" /></View>
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
                const todayRec = getStudentTodayRecord(student.id);
                const isDone = !!todayRec;

                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.studentCard, isDone && styles.studentCardDone]}
                    onPress={() => handleStudentSelect(student)}
                  >
                    <View style={[styles.avatar, isDone ? styles.avatarDone : styles.avatarPending]}>
                      {isDone ? <Feather name="check" size={20} color="white" /> : <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>}
                    </View>
                    
                    <View style={styles.studentInfoBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                        {isDone && <View style={styles.badgeDone}><Text style={styles.badgeDoneText}>✓ Hari ini</Text></View>}
                      </View>
                      
                      {isDone ? (
                        <Text style={styles.studentSubTextDone}>{todayRec.daily_prayer_title || todayRec.prayer_reading_title} · {todayRec.is_completed ? 'Lulus' : 'Belum'} · {todayRec.quality}</Text>
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
              <Text style={styles.studentHeaderSub}>Hafalan Doa / Sholat</Text>
              <Text style={styles.studentHeaderDate}>{formattedDate}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Kategori</Text>
                <View style={styles.rowBtnContainer}>
                  <TouchableOpacity
                    style={[styles.radioBtn, type === 'DOA_HARIAN' && styles.radioBtnActive]}
                    onPress={() => { setType('DOA_HARIAN'); setSelectedItem(null); }}
                  >
                    <Text style={[styles.radioText, type === 'DOA_HARIAN' && styles.radioTextActive]}>Doa Harian</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, type === 'BACAAN_SHOLAT' && styles.radioBtnActive]}
                    onPress={() => { setType('BACAAN_SHOLAT'); setSelectedItem(null); }}
                  >
                    <Text style={[styles.radioText, type === 'BACAAN_SHOLAT' && styles.radioTextActive]}>Bacaan Sholat</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Pilih Hafalan</Text>
                <TouchableOpacity style={styles.dropdownField} onPress={() => setShowItemPicker(true)}>
                  <Text style={[styles.dropdownFieldText, !selectedItem && styles.dropdownPlaceholder]} numberOfLines={1}>
                    {selectedItem ? selectedItem.title : 'Pilih Doa / Bacaan Sholat...'}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Modal visible={showItemPicker} transparent animationType="fade" onRequestClose={() => setShowItemPicker(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowItemPicker(false)}>
                  <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                    <Text style={styles.modalTitle}>
                      {type === 'DOA_HARIAN' ? 'Pilih Doa Harian' : 'Pilih Bacaan Sholat'}
                    </Text>
                    <FlatList
                      data={type === 'DOA_HARIAN' ? dailyPrayers : prayerReadings}
                      keyExtractor={(item) => String(item.id)}
                      style={{ maxHeight: 360 }}
                      ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                      ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada data.</Text>}
                      renderItem={({ item }) => {
                        const isSelected = selectedItem?.id === item.id;
                        return (
                          <TouchableOpacity
                            style={[styles.modalItem, isSelected && styles.modalItemActive]}
                            onPress={() => {
                              setSelectedItem(item);
                              setShowItemPicker(false);
                            }}
                          >
                            <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>{item.title}</Text>
                            {isSelected && <Feather name="check" size={18} color="#059669" />}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Status Lulus</Text>
                <View style={styles.rowBtnContainer}>
                  <TouchableOpacity
                    style={[styles.radioBtn, isCompleted === true && styles.radioBtnActive]}
                    onPress={() => setIsCompleted(true)}
                  >
                    <Text style={[styles.radioText, isCompleted === true && styles.radioTextActive]}>✓ Lulus</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, isCompleted === false && styles.radioBtnActiveError]}
                    onPress={() => setIsCompleted(false)}
                  >
                    <Text style={[styles.radioText, isCompleted === false && styles.radioTextActiveError]}>✗ Belum Lulus</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Kualitas/Nilai</Text>
                <View style={styles.rowBtnContainer}>
                  {['A', 'B', 'C'].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.qualityBtn, quality === val && styles.qualityBtnActive]}
                      onPress={() => setQuality(val)}
                    >
                      <Text style={[styles.qualityText, quality === val && styles.qualityTextActive]}>{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catatan (Opsional)</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Catatan untuk santri..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={saveRecord}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Simpan Hafalan</Text>}
              </TouchableOpacity>
            </View>
            
            {/* Recent Records */}
            {recentRecords.length > 0 && (
              <View style={styles.recentContainer}>
                <Text style={styles.recentTitle}>Riwayat Terakhir</Text>
                {recentRecords.map((r, i) => (
                  <View key={i} style={styles.recentItem}>
                    <View>
                      <Text style={styles.recentItemText}>{r.daily_prayer_title || r.prayer_reading_title}</Text>
                      <Text style={styles.recentItemDate}>{new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                       {r.is_completed ? <Feather name="check-circle" size={16} color="#10B981" /> : <Feather name="x-circle" size={16} color="#EF4444" />}
                       <View style={styles.recentItemQuality}><Text style={styles.recentItemQualityText}>{r.quality}</Text></View>
                    </View>
                  </View>
                ))}
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
    backgroundColor: '#ECFDF5',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
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
  studentHeaderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginTop: 4,
  },
  infoValueEmerald: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
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
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarPending: {
    backgroundColor: '#F1F5F9',
  },
  avatarDone: {
    backgroundColor: '#10B981',
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#64748B',
    fontSize: 16,
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeDoneText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
  },
  studentSubTextPending: {
    fontSize: 14,
    marginTop: 4,
  },
  studentSubTextDone: {
    fontSize: 14,
    color: '#059669',
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
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  radioBtnActiveError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  radioText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#059669',
  },
  radioTextActiveError: {
    color: '#EF4444',
  },
  qualityBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  qualityBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  qualityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  qualityTextActive: {
    color: '#fff',
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownFieldText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  modalItemActive: {
    backgroundColor: '#F0FDF4',
  },
  modalItemText: {
    fontSize: 16,
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  modalItemTextActive: {
    color: '#059669',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#059669',
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
  recentItemQuality: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recentItemQualityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  }
});
