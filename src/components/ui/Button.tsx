import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

type ButtonProps = {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ 
  onPress, 
  title, 
  variant = 'primary', 
  loading = false,
  disabled = false 
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#A0AEC0';
    switch (variant) {
      case 'primary':
        return '#3B82F6';
      case 'secondary':
        return '#6B7280';
      case 'outline':
        return 'transparent';
      default:
        return '#3B82F6';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineButton,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={[
          styles.text,
          variant === 'outline' && styles.outlineText
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  outlineText: {
    color: '#3B82F6',
  },
  disabled: {
    opacity: 0.7,
  },
}); 