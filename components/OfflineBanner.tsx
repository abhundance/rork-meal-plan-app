import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function OfflineBanner() {
  return (
    <View style={styles.banner} testID="offline-banner">
      <WifiOff size={14} color={Colors.offlineText} strokeWidth={2.5} />
      <Text style={styles.text}>You are offline. Showing your last saved data.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.offlineBanner,
  },
  text: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.offlineText,
  },
});
