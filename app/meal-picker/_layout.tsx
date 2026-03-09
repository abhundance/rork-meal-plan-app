import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function MealPickerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="delivery" />
    </Stack>
  );
}
