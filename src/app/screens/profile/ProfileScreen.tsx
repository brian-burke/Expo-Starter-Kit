import React from 'react';
import { ScrollView, View, Alert, Share, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileHeader } from '../../components/organisms/ProfileHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../../lib/supabase'; 

/**
 * ProfileScreen Component
 *
 * @description Profile screen that displays user information and actions
 * @returns {React.ReactElement} Profile screen component
 */
export function ProfileScreen(): React.ReactElement {
  const { isDarkMode } = useTheme();

  const handleEdit = () => {
    Alert.alert('Edit Profile', 'Edit profile functionality will be implemented here');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out my profile!',
        title: 'Share Profile',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share profile');
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await supabase.auth.signOut();
      if (response.error) {
        Alert.alert('Sign Out Error', response.error.message);
      } else {
        Alert.alert('Signed Out', 'You have been successfully signed out.');
        // Optionally, navigate to a login screen or splash screen after sign out
        // navigation.navigate('Login'); // You'd need to pass navigation prop
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred during sign out: ' + error.message);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <ScrollView className="flex-1">
        <ProfileHeader
          name="John Doe"
          title="Software Developer"
          bio="Passionate about building great mobile apps with React Native. Love to explore new technologies and share knowledge with the community."
          onEdit={handleEdit}
          onShare={handleShare}
          testID="profile-header"
        />

        {/* Sign Out Button */}
        <View className="p-4">
          <TouchableOpacity
            className={`py-3 px-6 rounded-lg ${isDarkMode ? 'bg-red-700' : 'bg-red-500'}`}
            onPress={handleSignOut}
            testID="sign-out-button"
          >
            <Text className="text-white text-center font-bold text-lg">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen;