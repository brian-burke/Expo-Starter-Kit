import { Stack } from 'expo-router';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          headerTitleStyle: {
            color: '#1F2937',
            fontSize: 18,
            fontWeight: '600',
          },
          headerTintColor: '#3B82F6',
        }}
      />
    </ProtectedRoute>
  );
} 