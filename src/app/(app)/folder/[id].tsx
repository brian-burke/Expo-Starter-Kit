import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { PlusIcon, ArrowLeftIcon } from 'lucide-react-native';
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
}

export default function FolderScreen() {
  const { id } = useLocalSearchParams();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { isDarkMode, accentColor } = useTheme();

  useEffect(() => {
    fetchFolderAndPhotos();
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
      console.log('photosData', photosData);
      setPhotos(photosData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch folder data');
      console.error('Error fetching folder data:', error);
    } finally {
      setLoading(false);
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
          .insert([
            {
              folder_id: id,
              storage_path: publicUrl,
            },
          ])
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 16,
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
}); 