import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { PenLine, Camera, Mic, Bike } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import type { InputType, UrlSource } from '@/utils/inputDetection';
import PrimaryButton from '@/components/PrimaryButton';
import FilterPill from '@/components/FilterPill';

interface SmartBarResultsProps {
  inputType: InputType;
  inputValue: string;
  urlSource?: UrlSource;
  onExtract: () => void;
  onGenerate: (name: string) => void;
  onJustSaveName: (name: string) => void;
  onAiChef: (prompt: string) => void;
  onManualEntry: () => void;
  onPhoto: () => void;
  onVoice: () => void;
  onDelivery: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function SmartBarResults({
  inputType,
  inputValue,
  urlSource,
  onExtract,
  onGenerate,
  onJustSaveName,
  onAiChef,
  onManualEntry,
  onPhoto,
  onVoice,
  onDelivery,
  isLoading = false,
  error,
}: SmartBarResultsProps) {
  // Empty state: method cards in explicit 2×2 rows + AI Chef below
  if (inputType === 'empty') {
    return (
      <View style={styles.emptyContainer}>
        {/* Row 1 */}
        <View style={styles.methodRow}>
          <TouchableOpacity style={styles.methodCard} onPress={onManualEntry} activeOpacity={0.7}>
            <View style={styles.methodIconContainer}>
              <PenLine size={20} color={Colors.primary} />
            </View>
            <Text style={styles.methodLabel}>Manual Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.methodCard} onPress={onPhoto} activeOpacity={0.7}>
            <View style={styles.methodIconContainer}>
              <Camera size={20} color={Colors.primary} />
            </View>
            <Text style={styles.methodLabel}>Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.methodRow}>
          <TouchableOpacity style={styles.methodCard} onPress={onVoice} activeOpacity={0.7}>
            <View style={styles.methodIconContainer}>
              <Mic size={20} color={Colors.primary} />
            </View>
            <Text style={styles.methodLabel}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.methodCard} onPress={onDelivery} activeOpacity={0.7}>
            <View style={styles.methodIconContainer}>
              <Bike size={20} color={Colors.primary} />
            </View>
            <Text style={styles.methodLabel}>Ordering In</Text>
          </TouchableOpacity>
        </View>

        {/* AI Chef section — fully separated from the grid */}
        <View style={styles.aiChefSection}>
          <Text style={styles.aiChefTitle}>Try asking AI Chef...</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exampleChipsScroll}
            contentContainerStyle={styles.exampleChipsContent}
          >
            <FilterPill
              label="Easy weeknight dinner"
              active={false}
              onPress={() => onAiChef('Easy weeknight dinner')}
            />
            <FilterPill
              label="Veggie stir-fry"
              active={false}
              onPress={() => onAiChef('Veggie stir-fry')}
            />
            <FilterPill
              label="Kid-friendly meal"
              active={false}
              onPress={() => onAiChef('Kid-friendly meal')}
            />
          </ScrollView>
        </View>
      </View>
    );
  }

  // URL state: extract recipe
  if (inputType === 'url' && urlSource) {
    return (
      <View style={styles.urlContainer}>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeIcon}>{urlSource.icon}</Text>
          <Text style={styles.sourceBadgeLabel}>{urlSource.label} detected</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton
          label={isLoading ? 'Extracting...' : 'Extract Recipe'}
          onPress={onExtract}
          disabled={isLoading}
          style={styles.extractButton}
        />
      </View>
    );
  }

  // Name state: generate or just save name
  if (inputType === 'name') {
    return (
      <View style={styles.nameContainer}>
        <PrimaryButton
          label="Generate Recipe with AI"
          onPress={() => onGenerate(inputValue)}
          disabled={!inputValue.trim()}
          style={styles.generateButton}
        />

        <Pressable
          onPress={() => onJustSaveName(inputValue)}
          style={({ pressed }) => [
            styles.secondaryButtonPressable,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.secondaryButtonText}>Just save the name</Text>
        </Pressable>

        <Text style={styles.infoNote}>
          This meal won't add items to your shopping list
        </Text>
      </View>
    );
  }

  // Conversation state: AI Chef card
  if (inputType === 'conversation') {
    const truncatedText =
      inputValue.length > 80 ? `${inputValue.substring(0, 80)}...` : inputValue;

    return (
      <View style={styles.conversationContainer}>
        <View style={styles.aiChefCard}>
          <View style={styles.chefHeader}>
            <Text style={styles.chefIcon}>🧑‍🍳</Text>
            <Text style={styles.chefTitle}>AI Chef</Text>
          </View>

          <Text style={styles.chefPreview}>{truncatedText}</Text>

          <Pressable
            onPress={() => onAiChef(inputValue)}
            style={({ pressed }) => [
              styles.aiChefButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.aiChefButtonText}>Let AI Chef help →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // ── Empty state ────────────────────────────────────────────────────────
  emptyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  methodCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  aiChefSection: {
    marginTop: Spacing.md,
  },
  aiChefTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  exampleChipsScroll: {
    height: 38,
  },
  exampleChipsContent: {
    gap: Spacing.sm,
    alignItems: 'center',
  },

  // ── URL state ──────────────────────────────────────────────────────────
  urlContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  sourceBadgeIcon: {
    fontSize: 16,
  },
  sourceBadgeLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  extractButton: {
    marginTop: Spacing.sm,
  },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.danger,
  },

  // ── Name state ─────────────────────────────────────────────────────────
  nameContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  generateButton: {
    marginTop: 0,
  },
  secondaryButtonPressable: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  infoNote: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ── Conversation state ─────────────────────────────────────────────────
  conversationContainer: {
    padding: Spacing.lg,
  },
  aiChefCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  chefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chefIcon: {
    fontSize: 24,
  },
  chefTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  chefPreview: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  aiChefButton: {
    paddingVertical: Spacing.sm,
  },
  aiChefButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
