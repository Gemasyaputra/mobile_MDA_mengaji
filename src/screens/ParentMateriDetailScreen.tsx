import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Lampiran materi disimpan sebagai satu URL generik (`pdf_url`) — materi baru diunggah
// sebagai gambar, tapi data lama sebelum perubahan itu mungkin masih PDF asli. RN tidak
// punya PDF-viewer bawaan (beda dari web yang pakai <iframe>), jadi PDF dibuka lewat Linking.
const isPdfUrl = (url: string) => /\.pdf($|\?)/i.test(url);

export default function ParentMateriDetailScreen({ route, navigation }: any) {
  const { item, type } = route.params;
  const isDailyPrayer = type === 'daily-prayers';

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.badgeRow}>
            {item.category && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.category}</Text>
              </View>
            )}
            {!isDailyPrayer && item.step_order !== undefined && item.step_order !== null && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Urutan: {item.step_order}</Text>
              </View>
            )}
          </View>

          {item.arabic_text ? (
            <Text style={styles.arabicText}>{item.arabic_text}</Text>
          ) : (
            <Text style={styles.emptyText}>Teks Arab belum tersedia untuk materi ini.</Text>
          )}

          {isDailyPrayer && item.latin_text ? (
            <Text style={styles.latinText}>{item.latin_text}</Text>
          ) : null}

          {item.translation ? (
            <View style={styles.translationBox}>
              <Text style={styles.translationLabel}>TERJEMAHAN</Text>
              <Text style={styles.translationText}>"{item.translation}"</Text>
            </View>
          ) : null}

          {item.pdf_url && !isPdfUrl(item.pdf_url) && (
            <Image source={{ uri: item.pdf_url }} style={styles.attachmentImage} resizeMode="contain" />
          )}

          {item.pdf_url && isPdfUrl(item.pdf_url) && (
            <TouchableOpacity style={styles.attachmentButton} onPress={() => openUrl(item.pdf_url)}>
              <Ionicons name="document-text" size={16} color="#059669" />
              <Text style={styles.attachmentButtonText}>Buka PDF Materi</Text>
            </TouchableOpacity>
          )}

          {item.external_link && (
            <TouchableOpacity style={styles.attachmentButton} onPress={() => openUrl(item.external_link)}>
              <Ionicons name="link" size={16} color="#2563EB" />
              <Text style={[styles.attachmentButtonText, { color: '#2563EB' }]}>Buka Link Materi</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  body: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  arabicText: {
    fontSize: 26,
    lineHeight: 46,
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  latinText: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 20,
  },
  translationBox: {
    marginTop: 16,
  },
  translationLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  translationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 13,
  },
  attachmentImage: {
    width: '100%',
    height: 300,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  attachmentButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
});
