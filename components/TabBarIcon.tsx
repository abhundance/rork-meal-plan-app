import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface TabBarIconProps {
  icon: React.ReactNode;
  showBadge?: boolean;
}

export default function TabBarIcon({ icon, showBadge = false }: TabBarIconProps) {
  return (
    <View style={styles.container}>
      {icon}
      {showBadge && <View style={styles.badge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
});
