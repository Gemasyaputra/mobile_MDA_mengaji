import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';

const PAGE_SIZE = 6;

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ParentKabarScreen({ navigation }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

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
    fetchPosts(1, false);
  }, [fetchPosts]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kabar Masjid</Text>
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
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {posts.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada kabar yang diposting.</Text>
          ) : (
            posts.map((post) => {
              const images: string[] = Array.isArray(post.images) ? post.images : [];
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('KabarDetail', { id: post.id })}
                >
                  {images.length > 0 ? (
                    <View style={styles.imageWrapper}>
                      <Image source={{ uri: images[0] }} style={styles.postImage} resizeMode="cover" />
                      {images.length > 1 && (
                        <View style={styles.imageCountBadge}>
                          <Ionicons name="images" size={12} color="#FFFFFF" />
                          <Text style={styles.imageCountText}>+{images.length - 1}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.imageWrapper, styles.imagePlaceholder]}>
                      <Ionicons name="megaphone" size={32} color="#A7F3D0" />
                    </View>
                  )}

                  <View style={styles.postBody}>
                    <Text style={styles.postDate}>{formatDate(post.activity_date || post.created_at)}</Text>
                    <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                    <Text style={styles.postExcerpt} numberOfLines={2}>{post.content}</Text>
                    {post.author_name ? (
                      <Text style={styles.postAuthor}>oleh {post.author_name}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {hasMore && posts.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => fetchPosts(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
    padding: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#D1FAE5',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
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
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  postBody: {
    padding: 16,
  },
  postDate: {
    fontSize: 11,
    color: '#059669',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  postExcerpt: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  postAuthor: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  loadMoreText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
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
});
