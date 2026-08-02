import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';

const CONTENT_MAX_LENGTH = 1000;

async function compressToDataUri(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: 1200 }).renderAsync();
  const result = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

export default function TeacherKabarFormScreen({ route, navigation }: any) {
  const editingPost = route.params?.post || null;
  const isEditing = !!editingPost;

  const [title, setTitle] = useState(editingPost?.title || '');
  const [content, setContent] = useState(editingPost?.content || '');
  const [images, setImages] = useState<string[]>(editingPost?.images || []);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      CustomAlert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk memilih foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    try {
      setCompressing(true);
      const compressed = await Promise.all(result.assets.map((asset) => compressToDataUri(asset.uri)));
      setImages((prev) => [...prev, ...compressed]);
    } catch (err) {
      console.error(err);
      CustomAlert.alert('Error', 'Gagal memproses gambar.');
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      CustomAlert.alert('Perhatian', 'Judul dan konten wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('teacher_token');
      if (!token) {
        CustomAlert.alert('Error', 'Sesi tidak valid. Silakan login ulang.');
        return;
      }

      const payload: any = { token, title: title.trim(), content: content.trim(), images };
      if (isEditing) payload.id = editingPost.id;

      const response = isEditing
        ? await axios.put(`${API_URL}/api/mobile/teacher/kabar`, payload)
        : await axios.post(`${API_URL}/api/mobile/teacher/kabar`, payload);

      if (response.data.success) {
        navigation.goBack();
      } else {
        CustomAlert.alert('Gagal', response.data.error || 'Gagal menyimpan kabar.');
      }
    } catch (err: any) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) {
        console.error(err);
        CustomAlert.alert('Error', err?.response?.data?.error || 'Terjadi kesalahan jaringan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting && !compressing;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Kabar' : 'Buat Kabar Baru'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Judul Kabar</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Contoh: Libur Kegiatan Mengaji"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              editable={!submitting}
              maxLength={150}
            />

            <View style={[styles.fieldRow, { marginTop: 18 }]}>
              <Text style={styles.label}>Isi Konten</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Tulis isi kabar atau pengumuman di sini..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={6}
              editable={!submitting}
              maxLength={CONTENT_MAX_LENGTH}
            />
            <Text style={styles.charCount}>{content.length}/{CONTENT_MAX_LENGTH}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={16} color="#059669" />
              <Text style={styles.sectionTitle}>Foto Lampiran</Text>
              <Text style={styles.optionalTag}>Opsional</Text>
            </View>

            {images.length > 0 && (
              <View style={styles.imageGrid}>
                {images.map((img, idx) => (
                  <View key={idx} style={styles.imageThumb}>
                    <Image source={{ uri: img }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(idx)} disabled={submitting}>
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.addImageButton} onPress={pickImages} disabled={submitting || compressing}>
              {compressing ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={20} color="#059669" />
                  <Text style={styles.addImageText}>{images.length > 0 ? 'Tambah Foto Lain' : 'Pilih Foto dari Galeri'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={isEditing ? 'checkmark-circle-outline' : 'send-outline'} size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{isEditing ? 'Simpan Perubahan' : 'Posting Kabar'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  content: { flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldRow: { flexDirection: 'row', gap: 3 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#334155' },
  required: { fontSize: 13, fontWeight: 'bold', color: '#EF4444' },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    fontSize: 14,
    color: '#1E293B',
    marginTop: 8,
  },
  textArea: { height: 130, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 11, color: '#94A3B8', marginTop: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#334155', flex: 1 },
  optionalTag: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  imageThumb: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 10,
    padding: 4,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: '#ECFDF5',
  },
  addImageText: { color: '#059669', fontWeight: 'bold', fontSize: 13 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: { backgroundColor: '#A7C4B8', shadowOpacity: 0 },
  submitButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
