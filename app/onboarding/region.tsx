import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { ChevronRight, X, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';

import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

// Maps ISO 3166-1 alpha-2 region codes (from device locale) to country names
// in the COUNTRIES list. Used to auto-detect the user's country on first load.
const REGION_CODE_TO_COUNTRY: Record<string, string> = {
  'AR': 'Argentina',
  'AT': 'Austria',
  'AU': 'Australia',
  'BD': 'Bangladesh',
  'BE': 'Belgium',
  'BR': 'Brazil',
  'CA': 'Canada',
  'CH': 'Switzerland',
  'CL': 'Chile',
  'CN': 'China',
  'CO': 'Colombia',
  'DE': 'Germany',
  'DK': 'Denmark',
  'EG': 'Egypt',
  'ES': 'Spain',
  'FI': 'Finland',
  'FR': 'France',
  'GB': 'United Kingdom',
  'GR': 'Greece',
  'HK': 'Hong Kong',
  'HU': 'Hungary',
  'ID': 'Indonesia',
  'IE': 'Ireland',
  'IL': 'Israel',
  'IN': 'India',
  'IT': 'Italy',
  'JP': 'Japan',
  'KE': 'Kenya',
  'KR': 'South Korea',
  'MM': 'Myanmar',
  'MX': 'Mexico',
  'MY': 'Malaysia',
  'NG': 'Nigeria',
  'NL': 'Netherlands',
  'NO': 'Norway',
  'NP': 'Nepal',
  'NZ': 'New Zealand',
  'PH': 'Philippines',
  'PK': 'Pakistan',
  'PL': 'Poland',
  'PT': 'Portugal',
  'RO': 'Romania',
  'SA': 'Saudi Arabia',
  'SE': 'Sweden',
  'SG': 'Singapore',
  'LK': 'Sri Lanka',
  'TH': 'Thailand',
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'US': 'United States',
  'VN': 'Vietnam',
  'ZA': 'South Africa',
  'AE': 'United Arab Emirates',
};

/**
 * Attempts to detect the user's country from the device locale string.
 * e.g. "en-ID" → "Indonesia", "ja-JP" → "Japan", "zh-Hans-CN" → "China"
 * Returns null if the region code is not in our country list.
 */
function detectCountryFromLocale(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const parts = locale.split('-');
    // The region code is typically the last segment (2 uppercase letters).
    // For locales like "zh-Hans-CN", the script tag "Hans" comes before the region "CN".
    for (let i = parts.length - 1; i >= 0; i--) {
      const segment = parts[i].toUpperCase();
      if (segment.length === 2 && REGION_CODE_TO_COUNTRY[segment]) {
        return REGION_CODE_TO_COUNTRY[segment];
      }
    }
    return null;
  } catch {
    return null;
  }
}

const COUNTRIES = [
  'Singapore',
  'Australia',
  'Canada',
  'China',
  'France',
  'Germany',
  'Hong Kong',
  'India',
  'Indonesia',
  'Ireland',
  'Italy',
  'Japan',
  'Malaysia',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Philippines',
  'South Korea',
  'Spain',
  'Taiwan',
  'Thailand',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
  'Austria',
  'Belgium',
  'Brazil',
  'Denmark',
  'Finland',
  'Greece',
  'Hungary',
  'Israel',
  'Norway',
  'Poland',
  'Portugal',
  'Romania',
  'Saudi Arabia',
  'South Africa',
  'Sweden',
  'Switzerland',
  'Turkey',
  'Argentina',
  'Chile',
  'Colombia',
  'Egypt',
  'Kenya',
  'Nigeria',
  'Pakistan',
  'Sri Lanka',
  'Bangladesh',
  'Nepal',
  'Myanmar',
];

export default function RegionScreen() {
  const insets = useSafeAreaInsets();
  const { data, setRegion, setStep } = useOnboarding();
  const [country, setCountry] = useState<string>(() => {
    // If the user previously saved a region, respect it
    if (data.region) return data.region;
    // Otherwise auto-detect from device locale — avoids hardcoding any default
    return detectCountryFromLocale() ?? '';
  });
  const [units, setUnits] = useState<'metric' | 'imperial'>(() => {
    if (data.measurement_units) return data.measurement_units;
    // Auto-detect: US uses imperial; most other countries use metric
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const parts = locale.split('-');
      const regionCode = parts[parts.length - 1].toUpperCase();
      if (regionCode === 'US') return 'imperial';
    } catch { /* fall through */ }
    return 'metric';
  });
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase();
    return COUNTRIES.filter(c => c.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleContinue = () => {
    setRegion(country.trim(), units);
    setStep(2);
    router.push('/onboarding/family-name' as Href);
  };

  const handleSelectCountry = (selected: string) => {
    setCountry(selected);
    setShowPicker(false);
    setSearchQuery('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingHeader current={1} total={11} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 1 of 11</Text>
        <Text style={styles.heading}>Where are you cooking from?</Text>
        <Text style={styles.subheading}>
          We'll tailor recipes and units to your region.
        </Text>

        <Text style={styles.inputLabel}>Country</Text>
        <TouchableOpacity
          style={styles.selectorRow}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
          testID="country-selector"
        >
          <Text style={[styles.selectorText, !country && styles.selectorPlaceholder]}>
            {country || 'Select your country…'}
          </Text>
          <ChevronRight size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Measurement Units</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleOption, units === 'metric' && styles.toggleOptionSelected]}
            onPress={() => setUnits('metric')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleEmoji]}>📏</Text>
            <Text style={[styles.toggleLabel, units === 'metric' && styles.toggleLabelSelected]}>
              Metric
            </Text>
            <Text style={[styles.toggleSub, units === 'metric' && styles.toggleSubSelected]}>
              g, ml, °C
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleOption, units === 'imperial' && styles.toggleOptionSelected]}
            onPress={() => setUnits('imperial')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleEmoji]}>🇺🇸</Text>
            <Text style={[styles.toggleLabel, units === 'imperial' && styles.toggleLabelSelected]}>
              Imperial
            </Text>
            <Text style={[styles.toggleSub, units === 'imperial' && styles.toggleSubSelected]}>
              oz, cups, °F
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <KeyboardAvoidingView
          style={styles.modalSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity
              onPress={() => { setShowPicker(false); setSearchQuery(''); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search countries..."
              placeholderTextColor={Colors.inactive}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Country list */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryRow}
                onPress={() => handleSelectCountry(item)}
                activeOpacity={0.6}
              >
                <Text style={styles.countryName}>{item}</Text>
                {item === country && (
                  <Check size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No countries found</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          />
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  selectorRow: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  selectorPlaceholder: {
    color: Colors.inactive,
    fontWeight: '400' as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  toggleEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  toggleLabelSelected: {
    color: Colors.primary,
  },
  toggleSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  toggleSubSelected: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  // Modal styles
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '10%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    fontFamily: FontFamily.semiBold,
    fontWeight: '400' as const,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontFamily: FontFamily.semiBold,
    fontWeight: '400' as const,
  },
  emptySearch: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
