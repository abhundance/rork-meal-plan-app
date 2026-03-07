import React, { useCallback, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { CalendarDays, ShoppingBasket, Heart, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Shadows } from '@/constants/theme';
import TabBarIcon from '@/components/TabBarIcon';

const tabBarLabelStyle = {
  fontSize: 11,
  fontWeight: '500' as const,
};

const tabBarStyle = {
  backgroundColor: Colors.background,
  borderTopWidth: 0,
  ...Shadows.tabBar,
};

const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.inactive,
  tabBarLabelStyle,
  tabBarStyle,
} as const;

function MealPlanIcon({ color }: { color: string }) {
  return <TabBarIcon icon={<CalendarDays size={22} color={color} strokeWidth={2} />} />;
}

function ShoppingIcon({ color }: { color: string }) {
  return <TabBarIcon icon={<ShoppingBasket size={22} color={color} strokeWidth={2} />} />;
}

function FavsIcon({ color }: { color: string }) {
  return <TabBarIcon icon={<Heart size={22} color={color} strokeWidth={2} />} />;
}

function DiscoverIcon({ color }: { color: string }) {
  return <TabBarIcon icon={<Sparkles size={22} color={color} strokeWidth={2} />} showBadge />;
}

const homeOptions = {
  title: 'Plan',
  tabBarIcon: MealPlanIcon,
};

const shoppingOptions = {
  title: 'Shopping',
  tabBarIcon: ShoppingIcon,
};

const favsOptions = {
  title: 'Favs',
  tabBarIcon: FavsIcon,
};

const discoverOptions = {
  title: 'Discover',
  tabBarIcon: DiscoverIcon,
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="(home)" options={homeOptions} />
      <Tabs.Screen name="shopping" options={shoppingOptions} />
      <Tabs.Screen name="favs" options={favsOptions} />
      <Tabs.Screen name="discover" options={discoverOptions} />
    </Tabs>
  );
}
