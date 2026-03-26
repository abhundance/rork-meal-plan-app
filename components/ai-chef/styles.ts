/**
 * Styles for the AI Chef chat feature.
 *
 * Centralised StyleSheet — imported by AiChefChat.tsx and RecipeCard.tsx.
 * All values come from design system tokens (Colors, Spacing, FontSize, etc.).
 */

import { StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Messages list
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ── Welcome state ─────────────────────────────────────────────────────────
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  chefAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  chefAvatarEmoji: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },

  // ── Inspiration cards ─────────────────────────────────────────────────────
  inspirationGrid: {
    width: '100%',
    gap: Spacing.sm,
  },
  inspirationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    gap: Spacing.md,
  },
  inspirationIcon: {
    fontSize: 24,
  },
  inspirationText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },

  // ── User message ──────────────────────────────────────────────────────────
  userRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.white,
    lineHeight: 22,
  },
  userImageContainer: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  userImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.card,
  },

  // ── Assistant message ─────────────────────────────────────────────────────
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chefAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chefAvatarSmallEmoji: {
    fontSize: 16,
  },
  assistantColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  assistantBubble: {
    maxWidth: '90%',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  assistantText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 22,
  },

  // ── Loading bubble ────────────────────────────────────────────────────────
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // ── Thinking indicator ────────────────────────────────────────────────────
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textSecondary,
  },
  thinkingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // ── Error bubble ──────────────────────────────────────────────────────────
  errorBubble: {
    maxWidth: '90%',
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  errorText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.danger,
    lineHeight: 22,
  },
  errorRetry: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },

  // ── Recipe card ───────────────────────────────────────────────────────────
  recipeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    maxWidth: '95%',
  },
  recipeHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recipeEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeEmoji: {
    fontSize: 24,
  },
  recipeHeaderText: {
    flex: 1,
  },
  recipeName: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
  },
  recipeDescription: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metaChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  metaChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  dietaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dietaryChip: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  dietaryChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.successText,
  },
  changesSummary: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.button,
    marginBottom: Spacing.sm,
  },
  changesSummaryText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.warningText,
  },

  // Expandable sections
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandableTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  ingredientsList: {
    paddingBottom: Spacing.sm,
  },
  ingredientItem: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 22,
    paddingLeft: Spacing.xs,
  },
  stepsList: {
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepNumber: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.primary,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 20,
  },

  // Recipe action buttons
  recipeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.white,
  },
  refineButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  refineButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },

  // Refine suggestion chips
  refineChipsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  refineChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  refineChip: {
    minHeight: 44,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refineChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  refineCustomBtn: {
    minHeight: 44,
    marginTop: Spacing.xs,
    justifyContent: 'center',
  },
  refineCustomBtnText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // ── Input bar ─────────────────────────────────────────────────────────────
  inputBarContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  pendingImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  pendingImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  pendingImageRemove: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingImageRemoveText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  toggleActionsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    gap: Spacing.xs,
  },
  inlineActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 36,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.surface,
  },

  // ── Voice recording inline states ─────────────────────────────────────────
  voiceCancelBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCancelText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  voiceRecordingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  voiceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  voiceTimer: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  voiceStopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTranscribingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  voiceTranscribingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
});

export default styles;
