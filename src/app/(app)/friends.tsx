import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { UserCircle, UserPlus, Check, X } from 'lucide-react-native';

type UserLink = {
  id: string;
  user_id: string;
  linked_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  linked_user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
};

export default function FriendsScreen() {
  const { user } = useAuth();
  const { isDarkMode, accentColor } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<UserLink[]>([]);
  const [friends, setFriends] = useState<UserLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  
  const fetchFriends = async () => {
    try {
    //   Fetch received friend requests
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('user_links')
        .select(`
          *,
          linked_user:user_id(
            id,
            full_name
          )
        `)
        .eq('linked_user_id', user?.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Fetch accepted friends
      const { data: acceptedFriends, error: acceptedError } = await supabase
        .from('user_links')
        .select(`
          *,
          linked_user:linked_user_id(
            id,
            full_name
          )
        `)
        .or(`user_id.eq.${user?.id},linked_user_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      if (acceptedError) throw acceptedError;

      setFriendRequests(receivedRequests || []);
      setFriends(acceptedFriends || []);

    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .ilike('full_name', `%${query}%`)
        .neq('id', user?.id)
        .limit(5);

        console.log('data', data);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('user_links')
        .insert([
          {
            user_id: user?.id,
            linked_user_id: friendId,
            status: 'pending'
          }
        ]);

      if (error) throw error;
      Alert.alert('Success', 'Friend request sent!');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      if (accept) {
        const { error } = await supabase
          .from('user_links')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_links')
          .update({ status: 'rejected' })
          .eq('id', requestId);

        if (error) throw error;
      }
      fetchFriends();
    } catch (error) {
      console.error('Error handling friend request:', error);
      Alert.alert('Error', 'Failed to handle friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('user_links')
        .delete()
        .or(`and(user_id.eq.${user?.id},linked_user_id.eq.${friendId}),and(user_id.eq.${friendId},linked_user_id.eq.${user?.id})`);

      if (error) throw error;
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff' }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff' }]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
              color: isDarkMode ? '#ffffff' : '#000000'
            }
          ]}
          placeholder="Search users..."
          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
        />
        {searching && <ActivityIndicator style={styles.searchSpinner} color={accentColor} />}
      </View>

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.searchResultItem, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                <View style={styles.userInfo}>
                  <UserCircle size={24} color={accentColor} />
                  <Text style={[styles.userName, { color: isDarkMode ? '#ffffff' : '#000000' }]}>
                    {item.full_name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: accentColor }]}
                  onPress={() => sendFriendRequest(item.id)}
                >
                  <UserPlus size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {friendRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#000000' }]}>
            Friend Requests
          </Text>
          <FlatList
            data={friendRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.requestItem, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                <View style={styles.userInfo}>
                  <UserCircle size={24} color={accentColor} />
                  <Text style={[styles.userName, { color: isDarkMode ? '#ffffff' : '#000000' }]}>
                    {item.linked_user?.user_metadata?.full_name || item.linked_user?.email}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: accentColor }]}
                    onPress={() => handleFriendRequest(item.id, true)}
                  >
                    <Check size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleFriendRequest(item.id, false)}
                  >
                    <X size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#000000' }]}>
          Friends ({friends.length})
        </Text>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const friendUser = item.user_id === user?.id ? item.linked_user : item.linked_user;
            return (
              <View style={[styles.friendItem, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                <View style={styles.userInfo}>
                  <UserCircle size={24} color={accentColor} />
                  <Text style={[styles.userName, { color: isDarkMode ? '#ffffff' : '#000000' }]}>
                    {friendUser?.full_name || friendUser?.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.removeButton]}
                  onPress={() => {
                    Alert.alert(
                      'Remove Friend',
                      'Are you sure you want to remove this friend?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friendUser?.id) }
                      ]
                    );
                  }}
                >
                  <X size={20} color={isDarkMode ? '#ffffff' : '#000000'} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 50,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchSpinner: {
    position: 'absolute',
    right: 12,
  },
  searchResults: {
    marginBottom: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    marginLeft: 8,
    fontSize: 16,
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeButton: {
    padding: 8,
  },
}); 