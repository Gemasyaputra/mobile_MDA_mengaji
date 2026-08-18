import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, TextInput, Platform, Modal, Image, KeyboardAvoidingView } from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';
import { toLocalDateString } from '../utils/date';

const JILID_OPTIONS = [1, 2, 3, 4, 5, 6].map((i) => `Jilid ${i}`);

export default function TeacherInputNgajiScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgradingLevel, setUpgradingLevel] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [surahModalVisible, setSurahModalVisible] = useState(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState('');
  const [jilidModalVisible, setJilidModalVisible] = useState(false);

  // Form State
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState('IQRO');
  const [levelOrSurah, setLevelOrSurah] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [quality, setQuality] = useState(8);
  const [readingStatus, setReadingStatus] = useState<'LANCAR' | 'MENGULANG'>('LANCAR');
  const [notes, setNotes] = useState('');

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

      // Fetch surahs for Al-Quran option
      const res = await axios.get(`${API_URL}/api/master-data?type=surahs`);
      if (res.data.success) {
        setSurahs(res.data.data);
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
          const recRes = await axios.get(`${API_URL}/api/learning-records?group_student_ids=${ids}&date=${effectiveDate}`);
          if (recRes.data.success) {
            setTodayRecords(recRes.data.data);
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
    const isAlquran = student.readingLevel === 'ALQURAN';
    const initType = isAlquran ? 'ALQURAN' : 'IQRO';
    setType(initType);
    setLevelOrSurah(initType === 'IQRO' ? 'Jilid 1' : 'Al-Fatihah');
    setStartPoint('');
    setEndPoint('');
    setQuality(8);
    setReadingStatus('LANCAR');
    setNotes('');
    setStep(3);

    // Fetch previous record for auto fill
    try {
      setLoading(true);
      const prevRes = await axios.get(`${API_URL}/api/learning-records?student_id=${student.id}&before_date=${date}&limit=1`);
      if (prevRes.data.success && prevRes.data.data.length > 0) {
        const prev = prevRes.data.data[0];
        setLevelOrSurah(prev.level_or_surah || (initType === 'IQRO' ? 'Jilid 1' : 'Al-Fatihah'));
        setStartPoint(prev.end_point || '');
      }

      const recentRes = await axios.get(`${API_URL}/api/learning-records?student_id=${student.id}&limit=5`);
      if (recentRes.data.success) {
        setRecentRecords(recentRes.data.data);
      }
    } catch (err) {
      console.log('Error auto fill', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRecord = async () => {
    if (!selectedStudent || !teacherToken) return;
    if (!levelOrSurah || !startPoint || !endPoint) {
      CustomAlert.alert('Peringatan', 'Silakan lengkapi Jilid/Surah, Hal/Ayat Awal, dan Akhir.');
      return;
    }
    const startNum = Number(startPoint);
    const endNum = Number(endPoint);
    if (Number.isFinite(startNum) && Number.isFinite(endNum) && startNum > endNum) {
      CustomAlert.alert('Peringatan', 'Hal/Ayat Awal tidak boleh lebih besar dari Akhir.');
      return;
    }
    if (!teacherId) {
      CustomAlert.alert('Error', 'Sesi guru tidak valid. Silakan login ulang.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        student_id: selectedStudent.id,
        teacher_id: teacherId,
        date: date,
        type: type === 'ALQURAN' ? 'QURAN' : 'IQRO',
        level_or_surah: levelOrSurah,
        start_point: startPoint,
        end_point: endPoint,
        quality: quality,
        reading_status: readingStatus,
        notes: notes,
        token: teacherToken
      };

      const res = await axios.post(`${API_URL}/api/learning-records`, payload);
      
      if (res.data.success) {
        CustomAlert.alert('Sukses', 'Setoran berhasil disimpan!');
        // Update local todayRecords
        setTodayRecords(prev => [...prev.filter(r => r.student_id !== selectedStudent.id), payload]);
        setStep(2);
        setSelectedStudent(null);
      } else {
        CustomAlert.alert('Gagal', res.data.message || 'Gagal menyimpan setoran');
      }
    } catch (err: any) {
      console.log('Error saving learning', err);
      CustomAlert.alert('Error', err.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeLevel = async () => {
    if (!selectedStudent || !teacherToken) return;
    CustomAlert.alert(
      'Konfirmasi Khatam',
      `Apakah santri ${selectedStudent.name} telah menyelesaikan Iqro dan siap lanjut ke Al-Quran?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Lanjut',
          onPress: async () => {
            try {
              setUpgradingLevel(true);
              const res = await axios.patch(
                `${API_URL}/api/students/${selectedStudent.id}/upgrade?token=${encodeURIComponent(teacherToken)}`
              );
              if (res.data.success) {
                setSelectedStudent((prev: any) => ({ ...prev, readingLevel: 'ALQURAN' }));
                setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, readingLevel: 'ALQURAN' } : s));
                setType('ALQURAN');
                setLevelOrSurah('Al-Fatihah');
                setStartPoint('');
                setEndPoint('');
                CustomAlert.alert('Sukses', 'Santri berhasil dinaikkan ke Al-Quran!');
              } else {
                CustomAlert.alert('Gagal', 'Gagal menaikkan level santri.');
              }
            } catch (err) {
              console.log('Error upgrading level', err);
              CustomAlert.alert('Error', 'Gagal menaikkan level santri.');
            } finally {
              setUpgradingLevel(false);
            }
          },
        },
      ]
    );
  };

  const filteredSurahs = surahs.filter((surah) => {
    const q = surahSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return surah.name_latin.toLowerCase().includes(q) || String(surah.id).startsWith(q);
  });

  const closeSurahModal = () => {
    setSurahModalVisible(false);
    setSurahSearchQuery('');
  };

  const getStudentTodayRecord = (id: number) => todayRecords.find(r => Number(r.student_id) === Number(id));
  const doneCount = students.filter(s => getStudentTodayRecord(s.id)).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep((s) => (s - 1) as any) : navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Pilih Kelas' : step === 2 ? 'Pilih Santri' : 'Setoran Tilawah'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

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
                  <View style={styles.iconBox}><Feather name="book-open" size={24} color="#059669" /></View>
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
                const isAlquran = student.readingLevel === 'ALQURAN';

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
                        {isDone && <View style={styles.badgeDone}><Text style={styles.badgeDoneText}>✓ Hari ini</Text></View>}
                      </View>
                      
                      {isDone ? (
                        <Text style={styles.studentSubTextDone}>{todayRec.level_or_surah} {todayRec.start_point ? `· ${todayRec.start_point}-${todayRec.end_point}` : ''} · Nilai {todayRec.quality}{todayRec.reading_status === 'MENGULANG' ? ' · Ulangi Besok' : ''}</Text>
                      ) : (
                        <Text style={styles.studentSubTextPending}>
                          <Text style={[styles.badgeLevel, isAlquran ? styles.badgeQuran : styles.badgeIqro]}>{isAlquran ? 'AL-QURAN ' : 'IQRO '}</Text>
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
              <Text style={styles.studentHeaderSub}>{type === 'IQRO' ? 'Iqro' : 'Al-Quran'}</Text>
              <Text style={styles.studentHeaderDate}>{formattedDate}</Text>
            </View>

            <View style={styles.formContainer}>
              {selectedStudent.readingLevel !== 'ALQURAN' && (
                <TouchableOpacity
                  style={styles.upgradeCard}
                  onPress={handleUpgradeLevel}
                  disabled={upgradingLevel}
                >
                  {upgradingLevel ? (
                    <ActivityIndicator color="#059669" style={{ alignSelf: 'center' }} />
                  ) : (
                    <View style={styles.upgradeCardRow}>
                      <View style={styles.upgradeCardTextBox}>
                        <Text style={styles.upgradeCardTitle}>🎉 Sudah khatam Iqro?</Text>
                        <Text style={styles.upgradeCardSub}>Ketuk untuk naikkan santri ini ke Al-Quran</Text>
                      </View>
                      <Feather name="chevron-right" size={20} color="#B45309" />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{type === 'IQRO' ? 'Jilid Iqro' : 'Nama Surat'}</Text>
                {type === 'IQRO' ? (
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setJilidModalVisible(true)}
                  >
                    <Text style={{ color: levelOrSurah ? '#1E293B' : '#94A3B8' }}>
                      {levelOrSurah || 'Pilih Jilid...'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.input, { justifyContent: 'center' }]} 
                    onPress={() => setSurahModalVisible(true)}
                  >
                    <Text style={{ color: levelOrSurah ? '#1E293B' : '#94A3B8' }}>
                      {levelOrSurah || 'Pilih Surat...'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.rowFormGroup}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>{type === 'IQRO' ? 'Mulai (Halaman)' : 'Ayat Mulai'}</Text>
                  <TextInput 
                    style={styles.input} 
                    value={startPoint}
                    onChangeText={setStartPoint}
                    placeholder="Awal"
                    keyboardType={type === 'IQRO' ? 'default' : 'numeric'}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>{type === 'IQRO' ? 'Sampai (Halaman)' : 'Ayat Akhir'}</Text>
                  <TextInput 
                    style={styles.input} 
                    value={endPoint}
                    onChangeText={setEndPoint}
                    placeholder="Akhir"
                    keyboardType={type === 'IQRO' ? 'default' : 'numeric'}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nilai (1-10)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowBtnContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.qualityBtn, quality === val && styles.qualityBtnActive]}
                      onPress={() => setQuality(val)}
                    >
                      <Text style={[styles.qualityText, quality === val && styles.qualityTextActive]}>{val}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Perlu Diulang Besok?</Text>
                <View style={styles.rowBtnContainer}>
                  <TouchableOpacity
                    style={[styles.radioBtn, readingStatus === 'LANCAR' && styles.radioBtnActive]}
                    onPress={() => setReadingStatus('LANCAR')}
                  >
                    <Text style={[styles.radioText, readingStatus === 'LANCAR' && styles.radioTextActive]}>✓ Sudah Lancar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, readingStatus === 'MENGULANG' && styles.radioBtnActiveError]}
                    onPress={() => setReadingStatus('MENGULANG')}
                  >
                    <Text style={[styles.radioText, readingStatus === 'MENGULANG' && styles.radioTextActiveError]}>↻ Ulangi Besok</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catatan</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Catatan evaluasi untuk santri..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={saveRecord}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Simpan Setoran</Text>}
              </TouchableOpacity>
            </View>
            
            {/* Recent Records */}
            {recentRecords.length > 0 && (
              <View style={styles.recentContainer}>
                <Text style={styles.recentTitle}>Riwayat Terakhir</Text>
                {recentRecords.map((r, i) => (
                  <View key={i} style={styles.recentItem}>
                    <View>
                      <Text style={styles.recentItemText}>{r.level_or_surah} {r.start_point ? `(${r.start_point}-${r.end_point})` : ''}</Text>
                      <Text style={styles.recentItemDate}>
                        {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {r.reading_status === 'MENGULANG' ? ' · Ulangi Besok' : ''}
                      </Text>
                    </View>
                    <View style={styles.recentItemQuality}><Text style={styles.recentItemQualityText}>{r.quality}</Text></View>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Jilid Selection Modal */}
      <Modal
        visible={jilidModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setJilidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Jilid</Text>
              <TouchableOpacity onPress={() => setJilidModalVisible(false)} style={{ padding: 5 }}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {JILID_OPTIONS.map((jilid) => (
                <TouchableOpacity
                  key={jilid}
                  style={styles.modalItem}
                  onPress={() => {
                    setLevelOrSurah(jilid);
                    setJilidModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{jilid}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Surah Selection Modal */}
      <Modal
        visible={surahModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSurahModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Surat</Text>
              <TouchableOpacity onPress={closeSurahModal} style={{ padding: 5 }}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputWrapper}>
              <Feather name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={surahSearchQuery}
                onChangeText={setSurahSearchQuery}
                placeholder="Cari nama atau nomor surat..."
                placeholderTextColor="#94A3B8"
                autoCorrect={false}
              />
              {surahSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSurahSearchQuery('')}>
                  <Feather name="x-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {surahs.length === 0 ? (
                <Text style={{ textAlign: 'center', margin: 20, color: '#94A3B8' }}>Memuat surat...</Text>
              ) : filteredSurahs.length === 0 ? (
                <Text style={{ textAlign: 'center', margin: 20, color: '#94A3B8' }}>Surat tidak ditemukan.</Text>
              ) : (
                filteredSurahs.map((surah) => (
                  <TouchableOpacity
                    key={surah.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setLevelOrSurah(surah.name_latin);
                      closeSurahModal();
                    }}
                  >
                    <Text style={styles.modalItemText}>{surah.id}. {surah.name_latin}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 280,
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
    overflow: 'visible',
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
    backgroundColor: '#10B981',
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
  badgeLevel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeQuran: { color: '#2563EB' },
  badgeIqro: { color: '#059669' },
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
  upgradeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  upgradeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeCardTextBox: {
    flex: 1,
    marginRight: 10,
  },
  upgradeCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B45309',
  },
  upgradeCardSub: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
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
  rowFormGroup: {
    flexDirection: 'row',
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
    borderRadius: 12,
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
    gap: 10,
  },
  radioBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  radioText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#059669',
  },
  radioBtnActiveError: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  radioTextActiveError: {
    color: '#B45309',
  },
  qualityBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qualityBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  qualityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
  },
  qualityTextActive: {
    color: '#fff',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 17,
    color: '#334155',
  }
});
