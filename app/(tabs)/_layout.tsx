import React, { useCallback, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { CalendarDays, ShoppingBasket, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Shadows } from '@/constants/theme';
import TabBarIcon from '@/components/TabBarIcon';

const tabBarLabelStyle = {
  fontFamily: FontFamily.semiBold,
  fontSize: 11,
  fontWeight: '600' as const,
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

function RecipesIcon({ color }: { color: string }) {
  return <TabBarIcon icon={<Heart size={22} color={color} strokeWidth={2} />} />;
}

const homeOptions = {
  title: 'Plan',
  tabBarIcon: MealPlanIcon,
};

const shoppingOptions = {
  title: 'Shopping',
  tabBarIcon: ShoppingIcon,
};

const recipesOptions = {
  title: 'Recipes',
  tabBarIcon: RecipesIcon,
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="(home)" options={homeOptions} />
      <Tabs.Screen name="shopping" options={shoppingOptions} />
      <Tabs.Screen name="recipes" options={recipesOptions} />
    </Tabs>
  );
}
