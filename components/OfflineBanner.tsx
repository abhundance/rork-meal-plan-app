import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';

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
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.offlineText,
  },
});
