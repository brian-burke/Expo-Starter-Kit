import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { PlusIcon, FolderIcon } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

interface Folder {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

export default function PhotosScreen() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { isDarkMode, accentColor } = useTheme();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const { data: folders, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(folders || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch folders');
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;

      const { data: folder, error } = await supabase
        .from('folders')
        .insert([{ 
          name: newFolderName.trim(),
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setFolders(prev => [folder, ...prev]);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
      console.error('Error creating folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFolder = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={[
        styles.folderItem,
        { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }
      ]}
      onPress={() => router.push(`/folder/${item.id}`)}
    >
      <FolderIcon size={24} color={accentColor} />
      <Text
        style={[
          styles.folderName,
          { color: isDarkMode ? '#F3F4F6' : '#1F2937' }
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#F3F4F6' : '#1F2937' }]}>
          My Photos
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: accentColor }]}
          onPress={() => setShowNewFolder(true)}
        >
          <PlusIcon size={24} color="white" />
        </TouchableOpacity>
      </View>

      {showNewFolder && (
        <View style={styles.newFolderContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                color: isDarkMode ? '#F3F4F6' : '#1F2937',
              }
            ]}
            placeholder="Enter folder name"
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            value={newFolderName}
            onChangeText={setNewFolderName}
          />
          <View style={styles.buttonContainer}>
            <Button
              title="Create"
              onPress={handleCreateFolder}
              loading={loading}
            />
            <Button
              title="Cancel"
              onPress={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
              variant="outline"
            />
          </View>
        </View>
      )}

      <FlatList
        data={folders}
        renderItem={renderFolder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.folderList}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
            No folders yet. Create one to get started!
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
    marginTop: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderList: {
    gap: 12,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
  },
  newFolderContainer: {
    marginBottom: 24,
    gap: 12,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
}); 