import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { handleTeacherAuthError } from '../utils/authError';

const PAGE_SIZE = 6;

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function TeacherKabarScreen({ navigation }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const loadTeacherId = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('teacher_token');
      if (!token) return;
      const res = await axios.get(`${API_URL}/api/mobile/teacher/me?token=${encodeURIComponent(token)}`);
      if (res.data.success) {
        setTeacherId(res.data.data.id);
      }
    } catch (err) {
      const handled = await handleTeacherAuthError(err, navigation);
      if (!handled) console.error(err);
    }
  }, [navigation]);

  const fetchPosts = useCallback(async (pageToLoad: number, append: boolean) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/activities?limit=${PAGE_SIZE}&page=${pageToLoad}`);
      if (response.data.success) {
        const newPosts = response.data.data || [];
        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        setHasMore(newPosts.length === PAGE_SIZE);
        setPage(pageToLoad);
      } else {
        setError(response.data.message || 'Gagal memuat kabar.');
      }
    } catch (err) {
      console.error(err);
      setError('Tidak dapat memuat kabar. Periksa koneksi ke server.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadTeacherId();
  }, [loadTeacherId]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1, false);
    }, [fetchPosts])
  );

  const handleDelete = (postId: number) => {
    setMenuOpenId(null);
    CustomAlert.alert('Hapus Postingan?', 'Tindakan ini tidak dapat dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('teacher_token');
            const res = await axios.delete(`${API_URL}/api/mobile/teacher/kabar?id=${postId}&token=${encodeURIComponent(token || '')}`);
            if (res.data.success) {
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } else {
              CustomAlert.alert('Gagal', res.data.error || 'Gagal menghapus kabar.');
            }
          } catch (err: any) {
            const handled = await handleTeacherAuthError(err, navigation);
            if (!handled) CustomAlert.alert('Error', err?.response?.data?.error || 'Terjadi kesalahan.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kabar Masjid</Text>
          <Text style={styles.headerSubtitle}>Kelola berita & pengumuman</Text>
        </View>
        <View style={styles.headerIconBadge}>
          <Ionicons name="megaphone" size={20} color="#FFFFFF" />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts(1, false)}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="newspaper-outline" size={36} color="#A7F3D0" />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Kabar</Text>
              <Text style={styles.emptyText}>Mulai bagikan berita atau pengumuman untuk orang tua santri.</Text>
            </View>
          ) : (
            posts.map((post) => {
              const images: string[] = Array.isArray(post.images) ? post.images : [];
              const isOwner = teacherId !== null && Number(post.author_id) === teacherId;
              const initial = (post.author_name || 'A').charAt(0).toUpperCase();
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('KabarDetail', { id: post.id })}
                >
                  {images.length > 0 && (
                    <View style={styles.imageWrapper}>
                      <Image source={{ uri: images[0] }} style={styles.postImage} resizeMode="cover" />
                      {images.length > 1 && (
                        <View style={styles.imageCountBadge}>
                          <Ionicons name="images" size={12} color="#FFFFFF" />
                          <Text style={styles.imageCountText}>+{images.length - 1}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.postBody}>
                    <View style={styles.authorRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.authorName}>{post.author_name || 'Admin'}</Text>
                        <Text style={styles.postDate}>{formatDate(post.activity_date || post.created_at)}</Text>
                      </View>
                      {isOwner && (
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                        >
                          <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {menuOpenId === post.id && (
                      <View style={styles.menuDropdown}>
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={() => {
                            setMenuOpenId(null);
                            navigation.navigate('TeacherKabarForm', { post: { ...post, images } });
                          }}
                        >
                          <Ionicons name="create-outline" size={16} color="#334155" />
                          <Text style={styles.menuItemText}>Edit</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(post.id)}>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Hapus</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postExcerpt} numberOfLines={3}>{post.content}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {hasMore && posts.length > 0 && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={() => fetchPosts(page + 1, true)} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator size="small" color="#059669" /> : <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TeacherKabarForm')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#D1FAE5', marginTop: 2 },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrapper: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#D1FAE5' },
  postImage: { width: '100%', height: '100%' },
  imageCountBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCountText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  postBody: { padding: 16, position: 'relative' },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  authorName: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  postDate: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  menuButton: { padding: 4 },
  menuDropdown: {
    position: 'absolute',
    top: 40,
    right: 16,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, minWidth: 120 },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9' },
  menuItemText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  postTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  postExcerpt: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadMoreText: { color: '#059669', fontWeight: 'bold', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  emptyText: { color: '#94A3B8', textAlign: 'center', fontSize: 13, lineHeight: 19 },
  errorText: { color: '#DC2626', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  retryButton: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
