import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UtensilsCrossed, User } from 'lucide-react-native';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { Shadows } from '@/constants/theme';

interface AppHeaderProps {
  title: string;
}

export default function AppHeader({ title }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.logoIcon}>
          <UtensilsCrossed size={18} color={Colors.primary} strokeWidth={2.5} />
        </View>
        <Text style={styles.wordmark}>Meal Plan</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => router.push('/family-settings' as Href)}
        testID="profile-button"
      >
        <User size={20} color={Colors.text} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    ...Shadows.header,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    flex: 2,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
