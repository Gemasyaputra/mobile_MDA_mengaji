import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { ActivityItem, ICON_CONFIG, buildTeacherMessage, formatRelativeTime } from '../utils/activityFeed';
import { handleTeacherAuthError } from '../utils/authError';

const LOCATION_CACHE_KEY = 'cached_teacher_location';

export default function TeacherHome({ navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    teacherName: 'Guru',
    totalClasses: 0,
    totalStudents: 0,
    presentToday: 0,
  });

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // For Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationName, setLocationName] = useState('📍 Memuat lokasi...');
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
        setLocationName('📍 Lokasi ditolak (Default)');
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
      setLocationName('📍 Gagal memuat lokasi');
    } finally {
      setLocationRefreshing(false);
    }
  };

  useEffect(() => {
    const loadLocation = async () => {
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
    }, 1000);
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
      const res = await axios.get(`${API_URL}/api/mobile/teacher/dashboard?token=${encodeURIComponent(token)}`);
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
                <Text style={styles.countdownText}>
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}
                </Text>
              </View>
            </View>
            
            <View style={styles.sholatBubbles}>
              {prayerTimes.map((s, i) => {
                // simple logic to highlight next prayer
                const currentHour = currentTime.getHours();
                const currentMinute = currentTime.getMinutes();
                const [prayerHour, prayerMinute] = s.time.split(':').map(Number);
                
                const timeInMinutes = currentHour * 60 + currentMinute;
                const prayerTimeInMinutes = prayerHour * 60 + prayerMinute;
                const isActive = Math.abs(prayerTimeInMinutes - timeInMinutes) < 60 && prayerTimeInMinutes >= timeInMinutes;

                return (
                  <View key={i} style={[styles.sholatBubble, isActive && styles.sholatBubbleActive]}>
                    <Text style={[styles.sholatName, isActive && styles.sholatTextActive]}>{s.name}</Text>
                    <Text style={[styles.sholatTime, isActive && styles.sholatTextActive]}>{s.time}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* --- STATS GRID --- */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL SANTRI</Text>
            {loading ? <ActivityIndicator color="#059669"/> : <Text style={styles.statValue}>{data.totalStudents}</Text>}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>HADIR HARI INI</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              {loading ? <ActivityIndicator color="#2563EB"/> : <Text style={[styles.statValue, { color: '#2563EB' }]}>{data.presentToday}</Text>}
              {!loading && data.totalStudents > 0 && (
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    {Math.round((data.presentToday / data.totalStudents) * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.statCard, { width: '100%' }]}>
            <Text style={styles.statLabel}>TOTAL KELAS</Text>
            {loading ? <ActivityIndicator color="#EA580C"/> : <Text style={[styles.statValue, { color: '#EA580C' }]}>{data.totalClasses}</Text>}
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
              style={[styles.quickCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}
              onPress={() => navigation.navigate('TeacherSantriList')}
            >
              <Feather name="users" size={24} color="#16A34A" />
              <Text style={[styles.quickCardText, { color: '#16A34A' }]}>Santri</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}
              onPress={() => navigation.navigate('TeacherAttendance')}
            >
              <MaterialCommunityIcons name="line-scan" size={24} color="#2563EB" />
              <Text style={[styles.quickCardText, { color: '#2563EB' }]}>Presensi</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickCard, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}
              onPress={() => navigation.navigate('TeacherInputNgaji')}
            >
              <Feather name="book-open" size={24} color="#9333EA" />
              <Text style={[styles.quickCardText, { color: '#9333EA' }]}>Setoran Tilawah</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}
              onPress={() => navigation.navigate('TeacherInputHafalan')}
            >
              <Feather name="book" size={24} color="#9333EA" />
              <Text style={[styles.quickCardText, { color: '#9333EA' }]}>Hafalan Santri</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}
              onPress={() => navigation.navigate('TeacherInputIbadah')}
            >
              <Feather name="sunrise" size={24} color="#D97706" />
              <Text style={[styles.quickCardText, { color: '#D97706' }]}>Ibadah</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- AKTIVITAS TERAKHIR --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderFlex}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.sectionIndicator, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.sectionTitle}>AKTIVITAS TERAKHIR</Text>
            </View>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>Kelas Anda</Text>
            </View>
          </View>

          <View style={styles.activityList}>
            {activitiesLoading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 20 }}/>
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
              <Feather name="arrow-right" size={16} color="#3B82F6" />
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
          <Feather name="message-square" size={20} color="#64748B" />
          <Text style={styles.navText}>Kabar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {
          Alert.alert(
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
        }}>
          <Feather name="settings" size={20} color="#64748B" />
          <Text style={styles.navText}>Keluar</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 16,
  },
  hijriText: {
    color: '#D1FAE5',
    fontSize: 12,
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
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  statBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: 'bold',
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    color: '#3B82F6',
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
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickCardText: {
    fontSize: 13,
    fontWeight: '600',
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
    color: '#3B82F6',
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
  }
});
