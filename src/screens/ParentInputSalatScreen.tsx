import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { API_URL } from '../config/api';
import { toLocalDateString } from '../utils/date';

const SALAT_FARDU_OPTIONS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
const SALAT_SUNAH_OPTIONS = ['Salat Jumat', 'Salat Duha', 'Salat Tahajud', 'Salat Rawatib'];

export default function ParentInputSalatScreen({ route, navigation }: any) {
  const { slug, studentId, studentName } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  // Form State
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState<'SALAT_FARDU' | 'SALAT_SUNAH'>('SALAT_FARDU');
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData(date);
  }, []);

  const loadData = async (effectiveDate: string) => {
    try {
      setLoading(true);
      const [todayRes, recentRes] = await Promise.all([
        axios.get(`${API_URL}/api/worship-records?student_id=${studentId}&date=${effectiveDate}`),
        axios.get(`${API_URL}/api/worship-records?student_id=${studentId}&limit=10`),
      ]);
      if (todayRes.data.success) {
        setTodayRecords(todayRes.data.data.filter((r: any) => r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH'));
      }
      if (recentRes.data.success) {
        setRecentRecords(recentRes.data.data.filter((r: any) => r.type === 'SALAT_FARDU' || r.type === 'SALAT_SUNAH'));
      }
    } catch (err) {
      console.log('Error loading salat data', err);
      CustomAlert.alert('Error', 'Gagal memuat data sholat');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const newDate = toLocalDateString(d);
    setDate(newDate);
    setSelectedPrayers([]);
    loadData(newDate);
  };

  const goToToday = () => {
    const todayStr = toLocalDateString(new Date());
    setDate(todayStr);
    setSelectedPrayers([]);
    loadData(todayStr);
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      const newDate = toLocalDateString(selected);
      setDate(newDate);
      setSelectedPrayers([]);
      loadData(newDate);
    }
  };

  const isToday = date === toLocalDateString(new Date());
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const alreadyRecordedForDate = todayRecords
    .filter(r => r.type === type)
    .map(r => r.prayer_name);

  const togglePrayer = (name: string) => {
    if (alreadyRecordedForDate.includes(name)) return;
    setSelectedPrayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const saveRecord = async () => {
    const toSave = selectedPrayers.filter(p => !alreadyRecordedForDate.includes(p));
    if (toSave.length === 0) {
      CustomAlert.alert('Peringatan', 'Silakan centang minimal satu sholat yang belum dicatat pada tanggal ini.');
      return;
    }

    setSaving(true);
    try {
      const savedPayloads: any[] = [];
      for (const prayer of toSave) {
        const payload = { slug, type, prayer_name: prayer, is_completed: true, date, notes };
        const res = await axios.post(`${API_URL}/api/mobile/parent/worship`, payload);
        if (res.data.success) {
          savedPayloads.push({ ...payload, student_id: studentId });
        }
      }

      if (savedPayloads.length > 0) {
        CustomAlert.alert('Sukses', `${savedPayloads.length} catatan sholat berhasil disimpan!`);
        setTodayRecords(prev => [...prev, ...savedPayloads]);
        setRecentRecords(prev => [...savedPayloads, ...prev]);
        setSelectedPrayers([]);
        setNotes('');
      } else {
        CustomAlert.alert('Gagal', 'Gagal menyimpan catatan');
      }
    } catch (err: any) {
      console.log('Error saving salat', err);
      CustomAlert.alert('Error', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catat Sholat</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.studentHeaderCard}>
          <Text style={styles.studentHeaderTitle}>{studentName}</Text>
          <Text style={styles.studentHeaderSub}>Dicatat oleh Orang Tua</Text>
        </View>

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

        {loading ? (
          <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Jenis Sholat</Text>
              <View style={styles.rowBtnContainer}>
                <TouchableOpacity
                  style={[styles.radioBtn, type === 'SALAT_FARDU' && styles.radioBtnActive]}
                  onPress={() => { setType('SALAT_FARDU'); setSelectedPrayers([]); }}
                >
                  <Text style={[styles.radioText, type === 'SALAT_FARDU' && styles.radioTextActive]}>Sholat Fardu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, type === 'SALAT_SUNAH' && styles.radioBtnActive]}
                  onPress={() => { setType('SALAT_SUNAH'); setSelectedPrayers([]); }}
                >
                  <Text style={[styles.radioText, type === 'SALAT_SUNAH' && styles.radioTextActive]}>Sholat Sunah</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Centang Sholat yang Sudah Dikerjakan</Text>
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Catatan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Catatan..."
                multiline
                numberOfLines={3}
              />
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
                    ? `Simpan ${selectedPrayers.filter(p => !alreadyRecordedForDate.includes(p)).length} Sholat`
                    : 'Simpan Sholat'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {recentRecords.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Riwayat Terakhir</Text>
            {recentRecords.map((r, i) => (
              <View key={i} style={styles.recentItem}>
                <View>
                  <Text style={styles.recentItemText}>{r.prayer_name}</Text>
                  <Text style={styles.recentItemDate}>{new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                </View>
                <Feather name="check-circle" size={16} color="#10B981" />
              </View>
            ))}
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
});
