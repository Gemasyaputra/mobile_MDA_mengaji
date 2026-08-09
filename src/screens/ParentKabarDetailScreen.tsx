import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Share,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, PUBLIC_WEB_URL } from '../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ParentKabarDetailScreen({ route, navigation }: any) {
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [post, setPost] = useState<any>(null);
  const [activeImage, setActiveImage] = useState(0);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (viewerVisible) {
      requestAnimationFrame(() => {
        viewerScrollRef.current?.scrollTo({ x: viewerIndex * SCREEN_WIDTH, animated: false });
      });
    }
  }, [viewerVisible]);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/activities?id=${id}`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        setPost(response.data.data[0]);
      } else {
        setError('Kabar tidak ditemukan.');
      }
    } catch (err) {
      console.error(err);
      setError('Tidak dapat memuat detail kabar.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      const url = `${PUBLIC_WEB_URL}/public/kabar/${post.id}`;
      await Share.share({
        message: `${post.title}\n\n${post.content}\n\n${url}\n\n— Kabar Masjid/MDA`,
        url, // dipakai iOS; di Android otomatis ikut tergabung ke pesan di atas
      });
    } catch (err) {
      console.error(err);
    }
  };

  const images: string[] = post && Array.isArray(post.images) ? post.images : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Kabar</Text>
        <TouchableOpacity onPress={handleShare} style={styles.backButton} disabled={!post}>
          <Ionicons name="share-social" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDetail}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {images.length > 0 && (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setActiveImage(idx);
                }}
              >
                {images.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => {
                      setViewerIndex(idx);
                      setViewerVisible(true);
                    }}
                  >
                    <Image source={{ uri: img }} style={styles.galleryImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.dotsRow}>
                  {images.map((_, idx) => (
                    <View key={idx} style={[styles.dot, idx === activeImage && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.body}>
            <Text style={styles.date}>{formatDate(post.activity_date || post.created_at)}</Text>
            <Text style={styles.title}>{post.title}</Text>
            {post.author_name ? <Text style={styles.author}>Diposting oleh {post.author_name}</Text> : null}
            <View style={styles.divider} />
            <Text style={styles.contentText}>{post.content}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <StatusBar hidden />
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            onPress={() => setViewerVisible(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewerIndex(idx);
            }}
          >
            {images.map((img, idx) => (
              <View key={idx} style={styles.viewerImageWrapper}>
                <Image source={{ uri: img }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.viewerDotsRow}>
              {images.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === viewerIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 260,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },
  body: {
    padding: 20,
  },
  date: {
    fontSize: 11,
    color: '#059669',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  author: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  contentText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  viewerDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    gap: 6,
  },
});
