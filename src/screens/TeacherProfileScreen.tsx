import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';

async function compressToDataUri(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: 600 }).renderAsync();
  const result = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

interface TeacherMe {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
}

export default function TeacherProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [teacher, setTeacher] = useState<TeacherMe | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('teacher_token');
      if (!token) {
        navigation.replace('DevLogin');
        return;
      }
      const res = await axios.get(`${API_URL}/api/mobile/teacher/me?token=${encodeURIComponent(token)}`);
      if (res.data.success) {
        setTeacher(res.data.data);
      }
    } catch (err) {
      handleTeacherAuthError(err, navigation);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleChangePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      CustomAlert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk memilih foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    setUploading(true);
    try {
      const dataUri = await compressToDataUri(result.assets[0].uri);
      const token = await AsyncStorage.getItem('teacher_token');
      const res = await axios.patch(`${API_URL}/api/mobile/teacher/me`, {
        token,
        photo_url: dataUri,
      });
      if (res.data.success) {
        setTeacher(res.data.data);
      } else {
        CustomAlert.alert('Gagal', res.data.message || 'Gagal menyimpan foto.');
      }
    } catch (err) {
      handleTeacherAuthError(err, navigation);
    } finally {
      setUploading(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Saya</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {teacher?.photoUrl ? (
              <Image source={{ uri: teacher.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{(teacher?.name || 'G').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} onPress={handleChangePhoto} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="camera" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{teacher?.name}</Text>
          <Text style={styles.email}>{teacher?.email}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color="#64748B" />
            <Text style={styles.infoText}>{teacher?.email || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color="#64748B" />
            <Text style={styles.infoText}>{teacher?.phone || '-'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color="#DC2626" />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarWrap: { width: 96, height: 96, marginBottom: 12 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#D1FAE5' },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 32, fontWeight: 'bold', color: '#059669' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#334155' },
  logoutBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
  },
  logoutText: { color: '#DC2626', fontWeight: 'bold', fontSize: 14 },
});
