import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';

export default function DevLoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const savedSlug = await AsyncStorage.getItem('parent_student_slug');
      if (savedSlug) {
        navigation.replace('ParentTabs', { slug: savedSlug });
        return; 
      }
      
      const savedTeacherToken = await AsyncStorage.getItem('teacher_token');
      if (savedTeacherToken) {
        navigation.replace('TeacherHome');
        return;
      }
    } catch (e) {
      console.error('Failed to read auth state', e);
    }
    setLoading(false);
  };

  const handleTeacherLogin = async () => {
    setLoading(true);
    try {
      // Buka browser internal untuk Google SSO di Next.js (Via Vercel Production)
      const returnUrl = Linking.createURL('login');
      const authUrl = `https://mda-mengaji.vercel.app/mobile-auth?returnUrl=${encodeURIComponent(returnUrl)}`;

      console.log('Opening auth session at:', authUrl);
      console.log('Return URL expected:', returnUrl);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (result.type === 'success' && result.url) {
        // Parse token dari URL kembalian (mdamengaji://login?token=XYZ)
        const { queryParams } = Linking.parse(result.url);
        
        if (queryParams?.error) {
           Alert.alert("Gagal Login", "Akses ditolak atau terjadi kesalahan.");
           setLoading(false);
           return;
        }

        if (queryParams?.token) {
          const tokenStr = queryParams.token as string;
          // Decode token for prototype
          // Dalam production, cukup simpan JWT rahasianya
          await AsyncStorage.setItem('teacher_token', tokenStr);
          navigation.replace('TeacherHome');
        } else {
           Alert.alert("Error", "Token tidak ditemukan.");
        }
      } else {
        // User cancel atau gagal
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal membuka layanan Google SSO.");
      setLoading(false);
    }
  };

  const handleParentLogin = () => {
    navigation.navigate('ParentQRLogin');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#0E945F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background SVG Pattern */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width="100%" height="100%" viewBox="0 0 60 60" style={styles.svgBackground}>
          <Path d="M30 0l30 30-30 30L0 30z" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.08" />
          <Path d="M0 0l30 30-30 30L-30 30z" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.08" />
          <Path d="M60 0l30 30-30 30L30 30z" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.08" />
          <Path d="M30 60l30 30-30 30L0 90z" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.08" />
          <Path d="M30 -60l30 30-30 30L0 -30z" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.08" />
        </Svg>
      </View>

      <View style={styles.topSection}>
        <View style={styles.iconContainer}>
          <Svg width="50" height="50" viewBox="0 0 24 24" fill="#0E945F">
            <Path d="M12 2C11.5 2 11 2.5 11 3v2.1A5.002 5.002 0 0 0 7 10v4H5a2 2 0 0 0-2 2v2h18v-2a2 2 0 0 0-2-2h-2v-4a5.002 5.002 0 0 0-4-4.9V3c0-.5-.5-1-1-1zm0 24c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zM9 13v-3c0-1.7 1.3-3 3-3s3 1.3 3 3v3h-6zm-4 7v-2h14v2H5z"/>
          </Svg>
        </View>
        <Text style={styles.title}>MDA Masjid</Text>
        <Text style={styles.title}>Nurul Huda</Text>
        <Text style={styles.subtitle}>Aplikasi Manajemen MDA Terpadu</Text>
      </View>

      <View style={styles.bottomCard}>
        <Text style={styles.cardTitle}>Masuk Aplikasi</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.teacherButton]} 
            onPress={handleTeacherLogin}
          >
            <Text style={styles.teacherButtonText}>Login Guru 👨‍🏫</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.parentButton]} 
            onPress={handleParentLogin}
          >
            <Text style={styles.buttonText}>Login Wali Santri 👨‍👩‍👦</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Dengan masuk, Anda menyetujui Ketentuan Layanan kami.
        </Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E945F',
  },
  svgBackground: {
    opacity: 0.5,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 12,
    fontWeight: '500',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 40,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  teacherButtonText: {
    color: '#0E945F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  parentButton: {
    backgroundColor: '#0E945F',
    shadowColor: '#0E945F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    marginTop: 24,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
