import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { PlusIcon, ArrowLeftIcon, UsersIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/Button';

interface Photo {
  id: string;
  url: string;
  created_at: string;
  folder_id: string;
  storage_path: string;
}

interface Folder {
  id: string;
  name: string;
  created_by: string;
}

interface FolderUser {
  id: string;
  user_id: string;
  full_name: string;
  can_upload: boolean;
  can_view: boolean;
}

interface UserSearchResult {
  id: string;
  full_name: string;
}

interface FolderUserResponse {
  id: string;
  user_id: string;
  can_upload: boolean;
  can_view: boolean;
  user_profiles: {
    full_name: string;
  };
}

export default function FolderScreen() {
  const { id } = useLocalSearchParams();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [folderUsers, setFolderUsers] = useState<FolderUser[]>([]);
  const { isDarkMode, accentColor } = useTheme();

  useEffect(() => {
    fetchFolderAndPhotos();
    fetchFolderUsers();
  }, [id]);

  const fetchFolderAndPhotos = async () => {
    try {
      // Fetch folder details
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', id)
        .single();

      if (folderError) throw folderError;
      setFolder(folderData);

      // Fetch photos in the folder
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('folder_id', id)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      setPhotos(photosData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch folder data');
      console.error('Error fetching folder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('folder_users')
        .select(`
          id,
          user_id,
          can_upload,
          can_view,
          user_profiles!inner (
            full_name
          )
        `)
        .eq('folder_id', id)
        .returns<FolderUserResponse[]>();

      if (error) throw error;

      const formattedUsers = data.map(user => ({
        id: user.id,
        user_id: user.user_id,
        full_name: user.user_profiles.full_name,
        can_upload: user.can_upload,
        can_view: user.can_view
      }));

      setFolderUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching folder users:', error);
      Alert.alert('Error', 'Failed to fetch folder users');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .ilike('full_name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    }
  };

  const handleAddUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('folder_users')
        .insert([{
          folder_id: id,
          user_id: userId,
          can_upload: true,
          can_view: true
        }]);

      if (error) throw error;

      // Refresh folder users list
      await fetchFolderUsers();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding user to folder:', error);
      Alert.alert('Error', 'Failed to add user to folder');
    }
  };

  const handleRemoveUser = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('folder_users')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      // Refresh folder users list
      await fetchFolderUsers();
    } catch (error) {
      console.error('Error removing user from folder:', error);
      Alert.alert('Error', 'Failed to remove user from folder');
    }
  };

  const handleUploadPhoto = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload images.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled) {
        setUploading(true);
        const file = result.assets[0];

        // Generate a unique file name
        const fileExt = file.uri.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${id}/${fileName}`;

        // Create FormData
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: fileName,
          type: `image/${fileExt}`,
        } as any);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, formData);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        // Save photo record in database
        const { data: photo, error: dbError } = await supabase
          .from('photos')
          .insert([{
            folder_id: id,
            storage_path: publicUrl,
            uploaded_by: user.id
          }])
          .select()
          .single();

        if (dbError) throw dbError;

        setPhotos(prev => [photo, ...prev]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={[
        styles.photoItem,
        { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }
      ]}
      onPress={() => {
        // Handle photo view/preview
      }}
    >
      <Image source={{ uri: item.storage_path }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff' }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff' }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeftIcon size={24} color={accentColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDarkMode ? '#F3F4F6' : '#1F2937' }]}>
          {folder?.name}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: accentColor }]}
            onPress={() => setShowFriendModal(true)}
          >
            <UsersIcon size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={handleUploadPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <PlusIcon size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.photoList}
        columnWrapperStyle={styles.photoRow}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
            No photos yet. Upload some to get started!
          </Text>
        }
      />

      <Modal
        visible={showFriendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#F3F4F6' : '#1F2937' }]}>
              Manage Folder Access
            </Text>
            <TouchableOpacity onPress={() => setShowFriendModal(false)}>
              <X size={24} color={isDarkMode ? '#F3F4F6' : '#1F2937'} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                  color: isDarkMode ? '#F3F4F6' : '#1F2937',
                }
              ]}
              placeholder="Search users..."
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {searchQuery.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.searchResultItem,
                    { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }
                  ]}
                  onPress={() => handleAddUser(user.id)}
                >
                  <Text style={{ color: isDarkMode ? '#F3F4F6' : '#1F2937' }}>
                    {user.full_name}
                  </Text>
                  <PlusIcon size={20} color={accentColor} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.currentUsers}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F3F4F6' : '#1F2937' }]}>
              Current Users
            </Text>
            {folderUsers.map(user => (
              <View
                key={user.id}
                style={[
                  styles.userItem,
                  { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }
                ]}
              >
                <Text style={{ color: isDarkMode ? '#F3F4F6' : '#1F2937' }}>
                  {user.full_name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveUser(user.id)}>
                  <X size={20} color={isDarkMode ? '#F3F4F6' : '#1F2937'} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 50,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoList: {
    gap: 12,
  },
  photoRow: {
    gap: 12,
  },
  photoItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchResults: {
    marginBottom: 24,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  currentUsers: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
}); 