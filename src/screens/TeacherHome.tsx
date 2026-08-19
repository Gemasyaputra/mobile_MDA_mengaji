import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomAlert } from '../components/CustomAlert';
import { API_URL } from '../config/api';
import { ActivityItem, ICON_CONFIG, buildTeacherMessage, formatRelativeTime } from '../utils/activityFeed';
import { handleTeacherAuthError } from '../utils/authError';
import { toLocalDateString } from '../utils/date';

const LOCATION_CACHE_KEY = 'cached_teacher_location';

const ATTENDANCE_STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  HADIR: { label: 'H', bg: '#D1FAE5', text: '#059669' },
  SAKIT: { label: 'S', bg: '#FEF3C7', text: '#B45309' },
  IZIN: { label: 'I', bg: '#DBEAFE', text: '#1D4ED8' },
  ALFA: { label: 'A', bg: '#FEE2E2', text: '#DC2626' },
};
const ATTENDANCE_STATUS_DEFAULT = { label: '–', bg: '#F1F5F9', text: '#CBD5E1' };

// Lokasi default: Masjid Nurul Huda (dipakai sebelum lokasi GPS didapat/di-refresh)
const MDA_LAT = -0.9379844;
const MDA_LNG = 100.4335174;
const MDA_NAME = 'Masjid Nurul Huda';

function getNextPrayerCountdown(prayerTimes: { name: string; time: string }[], now: Date) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const p of prayerTimes) {
    const [h, m] = p.time.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const t = h * 60 + m;
      if (t >= nowMinutes) {
        return { name: p.name, minutesLeft: t - nowMinutes };
      }
    }
  }
  // Semua waktu hari ini sudah lewat -> hitung mundur ke Subuh besok.
  const [h, m] = prayerTimes[0].time.split(':').map(Number);
  const minutesLeft = Number.isFinite(h) && Number.isFinite(m) ? (24 * 60 - nowMinutes) + (h * 60 + m) : 0;
  return { name: prayerTimes[0].name, minutesLeft };
}

function formatCountdown(minutesLeft: number) {
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export default function TeacherHome({ navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    teacherName: 'Guru',
    totalClasses: 0,
    totalStudents: 0,
    presentToday: 0,
    presentPagi: 0,
    presentSiang: 0,
    presentSore: 0,
  });

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [attendanceDetailVisible, setAttendanceDetailVisible] = useState(false);
  const [attendanceDetailLoading, setAttendanceDetailLoading] = useState(false);
  const [attendanceDetailClasses, setAttendanceDetailClasses] = useState<any[]>([]);

  // Jam cukup diperbarui tiap menit — dipakai untuk hitung waktu sholat berikutnya,
  // bukan buat ditampilkan sampai ke detik (boros re-render & baterai tanpa manfaat).
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationName, setLocationName] = useState(`📍 ${MDA_NAME} (Default)`);
  const [locationRefreshing, setLocationRefreshing] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState([
    { name: 'SUBUH', time: '--:--' },
    { name: 'DZUHUR', time: '--:--' },
    { name: 'ASHR', time: '--:--' },
    { name: 'MAGHRIB', time: '--:--' },
    { name: 'ISYA', time: '--:--' },
  ]);

  useFocusEffect(
    useCallback(() => {
      loadAuthToken();
    }, [])
  );

  const fetchPrayerTimes = async (latitude: number, longitude: number) => {
    const unixTime = Math.floor(new Date().getTime() / 1000);
    const res = await axios.get(`https://api.aladhan.com/v1/timings/${unixTime}?latitude=${latitude}&longitude=${longitude}&method=11`);
    if (res.data && res.data.code === 200) {
      const t = res.data.data.timings;
      setPrayerTimes([
        { name: 'SUBUH', time: t.Fajr },
        { name: 'DZUHUR', time: t.Dhuhr },
        { name: 'ASHR', time: t.Asr },
        { name: 'MAGHRIB', time: t.Maghrib },
        { name: 'ISYA', time: t.Isha },
      ]);
    }
  };

  const detectLocation = async () => {
    setLocationRefreshing(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName(`📍 ${MDA_NAME} (Default)`);
        await fetchPrayerTimes(MDA_LAT, MDA_LNG);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const resolvedName = geocode && geocode.length > 0
        ? (geocode[0].city || geocode[0].subregion || 'Lokasi Anda')
        : 'Lokasi Anda';

      setLocationName(`📍 ${resolvedName}`);
      await fetchPrayerTimes(latitude, longitude);

      await AsyncStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({ latitude, longitude, name: resolvedName })
      );
    } catch (e) {
      console.log('Error getting location/prayer', e);
      setLocationName(`📍 ${MDA_NAME} (Default)`);
      await fetchPrayerTimes(MDA_LAT, MDA_LNG);
    } finally {
      setLocationRefreshing(false);
    }
  };

  useEffect(() => {
    const loadLocation = async () => {
      // Tampilkan dulu jadwal shalat default (Masjid Nurul Huda) agar tidak kosong
      // sebelum lokasi cache/GPS berhasil dimuat.
      await fetchPrayerTimes(MDA_LAT, MDA_LNG);

      try {
        const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
        if (cached) {
          const { latitude, longitude, name } = JSON.parse(cached);
          setLocationName(`📍 ${name}`);
          await fetchPrayerTimes(latitude, longitude);
        } else {
          await detectLocation();
        }
      } catch (e) {
        console.log('Error loading cached location', e);
        await detectLocation();
      }
    };

    loadLocation();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('teacher_token');
      if (token) {
        fetchDashboardData(token);
        fetchTeacherIdAndActivities(token);
      } else {
        setLoading(false);
      }
    } catch (e) {
       console.log('Error loading token', e);
       setLoading(false);
    }
  };

  const fetchTeacherIdAndActivities = async (token: string) => {
    try {
      setActivitiesLoading(true);
      const meRes = await axios.get(`${API_URL}/api/mobile/teacher/me?token=${encodeURIComponent(token)}`);
      if (meRes.data.success) {
        const id = meRes.data.data.id;
        setTeacherId(id);
        const actRes = await axios.get(`${API_URL}/api/dashboard/activity?role=teacher&teacher_id=${id}&limit=3`);
        if (actRes.data.success) {
          setActivities(actRes.data.data || []);
        }
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) console.log('Error fetching activities', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuthToken();
    setRefreshing(false);
  };

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/mobile/teacher/dashboard?token=${encodeURIComponent(token)}&date=${toLocalDateString(new Date())}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) console.log('Error fetching dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    CustomAlert.alert(
      'Konfirmasi',
      'Yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('teacher_token');
            navigation.replace('DevLogin');
          },
        },
      ]
    );
  };

  const openAttendanceDetail = async () => {
    setAttendanceDetailVisible(true);
    setAttendanceDetailLoading(true);
    try {
      const token = await AsyncStorage.getItem('teacher_token');
      if (!token) return;
      const res = await axios.get(
        `${API_URL}/api/mobile/teacher/attendance-today?token=${encodeURIComponent(token)}&date=${toLocalDateString(new Date())}`
      );
      if (res.data.success) {
        setAttendanceDetailClasses(res.data.data.classes || []);
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) console.log('Error fetching attendance detail', err);
    } finally {
      setAttendanceDetailLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
      >
        
        {/* --- GREEN HEADER --- */}
        <View style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSubtitle}>Assalamualaikum,</Text>
              <Text style={styles.headerTitle}>{data.teacherName}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherProfile')} style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{data.teacherName.charAt(0)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagContainer}>
            <Feather name="users" size={14} color="#059669" />
            <Text style={styles.tagText}>MDA Masjid Nurul Huda</Text>
          </View>

          {/* Jadwal Sholat Area */}
          <View style={styles.jadwalContainer}>
            <View style={styles.jadwalHeader}>
              <View>
                <Text style={styles.dateText}>
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>{locationName}</Text>
                  <TouchableOpacity
                    onPress={detectLocation}
                    disabled={locationRefreshing}
                    style={styles.locationRefreshButton}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {locationRefreshing ? (
                      <ActivityIndicator size="small" color="#A7F3D0" />
                    ) : (
                      <Feather name="refresh-cw" size={12} color="#A7F3D0" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {(() => {
                  const next = getNextPrayerCountdown(prayerTimes, currentTime);
                  return (
                    <>
                      <Text style={styles.menujuText}>
                        Menuju {next.name.charAt(0) + next.name.slice(1).toLowerCase()}
                      </Text>
                      <Text style={styles.countdownText}>{formatCountdown(next.minutesLeft)}</Text>
                    </>
                  );
                })()}
              </View>
            </View>

            <View style={styles.sholatBubbles}>
              {(() => {
                const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                const startMinutes = prayerTimes.map((s) => {
                  const [h, m] = s.time.split(':').map(Number);
                  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
                });

                return prayerTimes.map((s, i) => {
                  const start = startMinutes[i];
                  let isActive = false;
                  if (start !== null) {
                    const nextStart = i < startMinutes.length - 1 ? startMinutes[i + 1] : startMinutes[0];
                    if (i < startMinutes.length - 1 && nextStart !== null) {
                      // Sesi biasa: aktif dari waktu sholat ini sampai sebelum waktu sholat berikutnya
                      // (mis. Ashar tetap "aktif" sampai menjelang Maghrib).
                      isActive = currentMinutes >= start && currentMinutes < nextStart;
                    } else {
                      // Isya: aktif dari waktu Isya sampai tengah malam, lalu lanjut sampai sebelum Subuh besok.
                      isActive = currentMinutes >= start || (nextStart !== null && currentMinutes < nextStart);
                    }
                  }

                  return (
                    <View key={i} style={[styles.sholatBubble, isActive && styles.sholatBubbleActive]}>
                      <Text style={[styles.sholatName, isActive && styles.sholatTextActive]}>{s.name}</Text>
                      <Text style={[styles.sholatTime, isActive && styles.sholatTextActive]}>{s.time}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          </View>
        </View>

        {/* --- STATS GRID --- */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardCompact}>
            <Text style={styles.statLabel}>SANTRI</Text>
            {loading ? <ActivityIndicator color="#059669"/> : <Text style={styles.statValueCompact}>{data.totalStudents}</Text>}
          </View>

          <TouchableOpacity style={styles.statCardCompact} activeOpacity={0.7} onPress={openAttendanceDetail}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>HADIR</Text>
              <Feather name="chevron-right" size={12} color="#94A3B8" />
            </View>
            {loading ? <ActivityIndicator color="#059669"/> : (() => {
              const pct = data.totalStudents > 0 ? Math.round((data.presentToday / data.totalStudents) * 100) : 0;
              const color = data.presentToday === 0 ? '#94A3B8' : pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626';
              return (
                <Text style={[styles.statValueCompact, { color }]}>
                  {data.presentToday}<Text style={styles.statValueCompactSub}>/{data.totalStudents}</Text>
                </Text>
              );
            })()}
          </TouchableOpacity>

          <View style={styles.statCardCompact}>
            <Text style={styles.statLabel}>KELAS</Text>
            {loading ? <ActivityIndicator color="#EA580C"/> : <Text style={[styles.statValueCompact, { color: '#EA580C' }]}>{data.totalClasses}</Text>}
          </View>
        </View>

        {/* --- AKSES CEPAT --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>AKSES CEPAT</Text>
          </View>
          
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('TeacherSantriList')}
            >
              <Feather name="users" size={22} color="#16A34A" />
              <Text style={styles.quickCardText}>Santri</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('TeacherAttendance')}
            >
              <MaterialCommunityIcons name="line-scan" size={22} color="#0D9488" />
              <Text style={styles.quickCardText}>Presensi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('TeacherInputNgaji')}
            >
              <Feather name="book-open" size={22} color="#9333EA" />
              <Text style={styles.quickCardText}>Setoran Tilawah</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('TeacherInputHafalan')}
            >
              <Feather name="book" size={22} color="#9333EA" />
              <Text style={styles.quickCardText}>Hafalan Santri</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('TeacherInputIbadah')}
            >
              <Feather name="sunrise" size={22} color="#D97706" />
              <Text style={styles.quickCardText}>Ibadah</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- AKTIVITAS TERAKHIR --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderFlex}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.sectionIndicator, { backgroundColor: '#059669' }]} />
              <Text style={styles.sectionTitle}>AKTIVITAS TERAKHIR</Text>
            </View>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>Kelas Anda</Text>
            </View>
          </View>

          <View style={styles.activityList}>
            {activitiesLoading ? (
              <ActivityIndicator color="#059669" style={{ marginVertical: 20 }}/>
            ) : activities.length > 0 ? (
              activities.map((act, idx) => {
                const config = ICON_CONFIG[act.type] || ICON_CONFIG.attendance;
                const segments = buildTeacherMessage(act);
                return (
                  <View key={idx} style={styles.activityItem}>
                    <View style={[styles.activityIcon, { backgroundColor: config.bg }]}>
                      <Ionicons name={config.icon as any} size={16} color={config.color} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>
                        {segments.map((seg, si) => (
                          <Text key={si} style={seg.bold ? styles.bold : undefined}>{seg.text}</Text>
                        ))}
                      </Text>
                      <Text style={styles.activityTime}>• {formatRelativeTime(act.ts)}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
               <Text style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>Belum ada aktivitas.</Text>
            )}

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => teacherId && navigation.navigate('TeacherActivityLog', { teacherId })}
            >
              <Text style={styles.viewAllText}>Lihat Semua Aktivitas</Text>
              <Feather name="arrow-right" size={16} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* --- FAKE BOTTOM NAV --- */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 10 }]}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconActiveBg}>
            <Text style={{color: '#FFF', fontWeight:'bold', fontSize: 16}}>N</Text>
          </View>
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TeacherSantriList')}>
          <Feather name="users" size={20} color="#64748B" />
          <Text style={styles.navText}>Santri</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TeacherAttendance')}>
          <Feather name="bar-chart-2" size={20} color="#64748B" />
          <Text style={styles.navText}>Presensi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TeacherKabar')}>
          <Ionicons name="megaphone-outline" size={20} color="#64748B" />
          <Text style={styles.navText}>Kabar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#DC2626" />
          <Text style={[styles.navText, styles.navTextLogout]}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={attendanceDetailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAttendanceDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Kehadiran Hari Ini</Text>
              <TouchableOpacity onPress={() => setAttendanceDetailVisible(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {attendanceDetailLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#059669" size="large" />
              </View>
            ) : attendanceDetailClasses.length === 0 ? (
              <Text style={styles.modalEmptyText}>Belum ada data santri.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '100%' }}>
                {attendanceDetailClasses.map((cls: any) => (
                  <View key={cls.classId} style={styles.modalClassBlock}>
                    <Text style={styles.modalClassName}>{cls.className}</Text>
                    {cls.students.length === 0 ? (
                      <Text style={styles.modalEmptyText}>Belum ada santri di kelas ini.</Text>
                    ) : (
                      <>
                        <View style={styles.modalSessionHeaderRow}>
                          <View style={{ flex: 1 }} />
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {(['Pagi', 'Siang', 'Sore'] as const).map((label) => (
                              <Text
                                key={label}
                                style={styles.modalSessionHeaderText}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                              >
                                {label}
                              </Text>
                            ))}
                          </View>
                        </View>
                        {cls.students.map((s: any) => (
                        <View key={s.id} style={styles.modalStudentRow}>
                          <Text style={styles.modalStudentName} numberOfLines={1}>{s.name}</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {(['PAGI', 'SIANG', 'SORE'] as const).map((sess) => {
                              const status = s.sessions?.[sess];
                              const meta = status ? (ATTENDANCE_STATUS_META[status] || ATTENDANCE_STATUS_DEFAULT) : ATTENDANCE_STATUS_DEFAULT;
                              return (
                                <View key={sess} style={[styles.modalSessionChip, { backgroundColor: meta.bg }]}>
                                  <Text style={[styles.modalSessionChipText, { color: meta.text }]}>{meta.label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                        ))}
                      </>
                    )}
                  </View>
                ))}
                <View style={{ height: 8 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    backgroundColor: '#059669',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerSubtitle: {
    color: '#D1FAE5',
    fontSize: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#047857',
    borderWidth: 2,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBadgeText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  tagText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  jadwalContainer: {
    marginTop: 10,
  },
  jadwalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationText: {
    color: '#A7F3D0',
    fontSize: 11,
  },
  locationRefreshButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menujuText: {
    color: '#D1FAE5',
    fontSize: 11,
    fontWeight: '600',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sholatBubbles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sholatBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sholatBubbleActive: {
    backgroundColor: '#34D399',
  },
  sholatName: {
    color: '#D1FAE5',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sholatTime: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sholatTextActive: {
    color: '#064E3B',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  statCardCompact: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  statValueCompact: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  statValueCompactSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 16,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    letterSpacing: 0.5,
  },
  filterBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  activityList: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  activityTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  viewAllText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconActiveBg: {
    backgroundColor: '#1E293B',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  navTextActive: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  navTextLogout: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalEmptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalClassBlock: {
    marginBottom: 16,
  },
  modalClassName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalStudentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalStudentName: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  modalSessionChip: {
    width: 30,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSessionChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalSessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalSessionHeaderText: {
    width: 30,
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
