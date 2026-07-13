import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URL } from '../config/api';
import { Feather } from '@expo/vector-icons';

export default function ParentQRLoginScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>Izinkan kamera untuk menyeken QR Code ID Card santri.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionText}>Berikan Izin Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Batal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const processQRCode = async (data: string) => {
    if (scanned) return;
    setScanned(true);

    const scannedSlug = data;

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/mobile/parent/student/${scannedSlug}`);
      
      if (response.data.success) {
        await AsyncStorage.setItem('parent_student_slug', scannedSlug);
        navigation.replace('ParentTabs', { slug: scannedSlug });
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "QR Tidak Valid ❌", 
        "Data santri tidak ditemukan. Pastikan Anda menyeken QR Code resmi dari sekolah.",
        [{ text: "Scan Lagi", onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = async ({ type, data }: any) => {
    await processQRCode(data);
  };

  const pickImageFromGallery = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        setScanned(true); // Pause camera
        const uri = result.assets[0].uri;

        // Use api.qrserver.com to decode local image
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          name: 'qr.jpg',
          type: 'image/jpeg'
        } as any);

        const response = await axios.post('http://api.qrserver.com/v1/read-qr-code/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data && response.data[0] && response.data[0].symbol[0].data) {
          const qrData = response.data[0].symbol[0].data;
          await processQRCode(qrData);
        } else {
          Alert.alert("Gagal membaca QR", "Tidak ada kode QR yang valid pada gambar tersebut.", [
            { text: "Coba Lagi", onPress: () => setScanned(false) }
          ]);
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Gallery picker error', e);
      Alert.alert("Error", "Gagal memproses gambar.");
      setLoading(false);
      setScanned(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login Wali Santri</Text>
        <View style={{ width: 60 }} /> 
      </View>

      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanBox} />
          </View>
        </CameraView>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingBoxText}>Memeriksa Data...</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Arahkan kamera ke QR Code yang ada di ID Card anak Anda.
        </Text>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
          <Feather name="image" size={20} color="#059669" />
          <Text style={styles.galleryButtonText}>Pilih dari Galeri</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F8FAFC' },
  message: { textAlign: 'center', paddingBottom: 20, fontSize: 16, color: '#334155' },
  permissionButton: { backgroundColor: '#059669', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 12 },
  permissionText: { color: 'white', fontWeight: 'bold' },
  backButton: { padding: 16 },
  backButtonText: { color: '#64748B', fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cancelText: { color: '#64748B', fontSize: 16 },
  headerTitle: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' },
  cameraContainer: { flex: 1, overflow: 'hidden', borderRadius: 24, margin: 16 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#10B981', backgroundColor: 'transparent', borderRadius: 16 },
  footer: { padding: 24, alignItems: 'center' },
  footerText: { color: '#64748B', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  galleryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  galleryButtonText: { marginLeft: 8, color: '#059669', fontWeight: 'bold', fontSize: 16 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center' },
  loadingBoxText: { marginTop: 12, color: '#111827', fontWeight: 'bold' }
});
