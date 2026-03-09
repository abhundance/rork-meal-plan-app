/**
 * Add to Favs — choose screen (library-only, no slot context).
 *
 * Reached via router.push('/add-to-favs') from the Favs tab FAB
 * or the add-tile in the Favs grid.
 *
 * ⚠️ No "From My Favourites" card here — the user is already on the Favs tab.
 * ⚠️ No slot context — this flow adds to the recipe library, not to the plan.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Pencil, Sparkles, Bike, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';

export default function AddToFavsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.closeBtn} />
        <Text style={styles.headerTitle}>Add a Meal</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          testID="add-to-favs-close-btn"
        >
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Option tiles */}
      <View style={styles.optionsWrap} testID="option-rows">
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.8}
          onPress={() => router.push('/add-recipe-entry')}
          testID="add-with-recipe-btn"
        >
          <View style={[styles.optionIconCircle, { backgroundColor: Colors.primaryLight }]}>
            <Sparkles size={16} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.optionTextBlock}>
            <Text style={styles.optionTitle}>Add with Recipe</Text>
            <Text style={styles.optionSubtitle}>AI mode, manual entry & more</Text>
          </View>
          <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.optionSeparator} />

        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.8}
          onPress={() => router.push('/add-to-favs/manual')}
          testID="add-without-recipe-btn"
        >
          <View style={[styles.optionIconCircle, { backgroundColor: Colors.primaryLight }]}>
            <Pencil size={16} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.optionTextBlock}>
            <Text style={styles.optionTitle}>Add without Recipe</Text>
            <Text style={styles.optionSubtitle}>Just a name — add the recipe later</Text>
          </View>
          <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.optionSeparator} />

        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.8}
          onPress={() => router.push('/add-to-favs/delivery')}
          testID="add-delivery-btn"
        >
          <View style={[styles.optionIconCircle, { backgroundColor: Colors.primaryLight }]}>
            <Bike size={16} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.optionTextBlock}>
            <Text style={styles.optionTitle}>Add from Delivery App</Text>
            <Text style={styles.optionSubtitle}>Save a link from Uber Eats, Grab & more</Text>
          </View>
          <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsWrap: {
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  optionSeparator: {
    height: 1,
    backgroundColor: Colors.surface,
    marginLeft: 66,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
