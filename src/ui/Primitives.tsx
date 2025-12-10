import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';

export const Button = ({
  label,
  onPress,
  disabled,
  variant = 'primary',
  loading,
}: {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}) => {
  const style =
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton;
  const textStyle =
    variant === 'primary' ? styles.buttonText : styles.buttonTextAlt;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        style,
        (disabled || loading) && {opacity: 0.5},
        {flexDirection: 'row', alignItems: 'center', gap: 6},
      ]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#0f172a' : '#e2e8f0'} /> : null}
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
};

export const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

export const Tag = ({label}: {label: string}) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{label}</Text>
  </View>
);

const styles = {
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  buttonTextAlt: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 6,
  },
  cardTitle: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  tag: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    color: '#cbd5f5',
    fontSize: 12,
  },
};
