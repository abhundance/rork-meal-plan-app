import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import {
  ChevronLeft, Lock, Users, User, UtensilsCrossed, Ruler, Leaf,
  Globe, LogOut, Trash2, Shield,
  ChevronRight, Sparkles, Check, Camera,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import MealSlotEditor from '@/components/MealSlotEditor';
import Stepper from '@/components/Stepper';
import DietaryPillGrid from '@/components/DietaryPillGrid';
import { MealSlot } from '@/types';
import { isEmojiAvatar } from '@/utils/familyAvatar';

function SectionHeader({ title, icon, locked, adminName }: {
  title: string;
  icon?: React.ReactNode;
  locked?: boolean;
  adminName?: string;
}) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  return (
    <View style={sectionStyles.header}>
      <View style={sectionStyles.headerLeft}>
        {icon}
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {locked && (
        <TouchableOpacity
          onPress={() => setShowTooltip(!showTooltip)}
          style={sectionStyles.lockButton}
        >
          <Lock size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={sectionStyles.lockLabel}>Admin only</Text>
        </TouchableOpacity>
      )}
      {showTooltip && adminName && (
        <View style={sectionStyles.tooltip}>
          <Text style={sectionStyles.tooltipText}>Only {adminName} can change this</Text>
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  lockLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tooltip: {
    position: 'absolute',
    right: 0,
    top: 32,
    backgroundColor: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 12,
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
});

function SettingRow({ icon, label, value, onPress, rightContent }: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={rowStyles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={rowStyles.left}>
        <View style={rowStyles.iconWrap}>{icon}</View>
        <View style={rowStyles.textWrap}>
          <Text style={rowStyles.label}>{label}</Text>
          {value ? <Text style={rowStyles.value} numberOfLines={1}>{value}</Text> : null}
        </View>
      </View>
      {rightContent || (onPress && (
        <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
      ))}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  value: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

function SwitchRow({ label, value, onValueChange }: {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  return (
    <View style={switchStyles.row}>
      <Text style={switchStyles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.surface, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

const switchStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  label: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.text,
  },
});

export default function FamilySettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    familySettings, userSettings, notificationSettings, familyMembers,
    updateFamilySettings, updateUserSettings, updateNotificationSettings,
    updateMealSlots,
  } = useFamilySettings();

  const isAdmin = userSettings.is_admin;
  const adminName = familyMembers.find(m => m.is_admin)?.display_name ?? 'Admin';

  const [showMealSlots, setShowMealSlots] = useState<boolean>(false);
  const [showHousehold, setShowHousehold] = useState<boolean>(false);
  const [showFamilyDietary, setShowFamilyDietary] = useState<boolean>(false);
  const [showPersonalDietary, setShowPersonalDietary] = useState<boolean>(false);
  const [showAccount, setShowAccount] = useState<boolean>(false);
  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(false);
  const [showRegionPicker, setShowRegionPicker] = useState<boolean>(false);
  // Emoji picker removed — replaced by real photo picker

  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [editingFamilyName, setEditingFamilyName] = useState<boolean>(false);
  const [familyNameDraft, setFamilyNameDraft] = useState<string>(familySettings.family_name);
  const [editingDisplayName, setEditingDisplayName] = useState<boolean>(false);
  const [displayNameDraft, setDisplayNameDraft] = useState<string>(userSettings.display_name);

  const [mealSlotsDraft, setMealSlotsDraft] = useState<MealSlot[]>(familySettings.meal_slots);

  const handleSaveMealSlots = useCallback(() => {
    const valid = mealSlotsDraft.filter(s => s.name.trim());
    if (valid.length === 0) return;
    updateMealSlots(valid);
    setShowMealSlots(false);
    console.log('[Settings] Meal slots updated');
  }, [mealSlotsDraft, updateMealSlots]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {
        console.log('[Settings] User signed out');
        router.replace('/onboarding/auth' as Href);
      }},
    ]);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm.');
      return;
    }
    console.log('[Settings] Account deleted');
    Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
  }, [deleteConfirmText]);

  const handleDeleteFamily = useCallback(() => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm.');
      return;
    }
    const name = familySettings.family_name || 'Your';
    console.log('[Settings] Family deleted');
    Alert.alert('Family Deleted', `The ${name} plan has been deleted.`);
  }, [deleteConfirmText, familySettings.family_name]);

  /** Opens camera or photo library to set a real family profile photo */
  const pickFamilyAvatar = useCallback(() => {
    Alert.alert('Family Photo', 'Choose how to set your family photo', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Camera access is required to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1] as [number, number],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]?.uri) {
            updateFamilySettings({ family_avatar_url: result.assets[0].uri });
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Photo library access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1] as [number, number],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]?.uri) {
            updateFamilySettings({ family_avatar_url: result.assets[0].uri });
          }
        },
      },
      {
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => updateFamilySettings({ family_avatar_url: '' }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [updateFamilySettings]);

  const slotNames = familySettings.meal_slots
    .sort((a, b) => a.order - b.order)
    .map(s => s.name)
    .join(', ');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="settings-back"
        >
          <ChevronLeft size={22} color={Colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Family Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {familySettings.family_avatar_url && !isEmojiAvatar(familySettings.family_avatar_url) ? (
                // Real photo URI
                <Image
                  source={{ uri: familySettings.family_avatar_url }}
                  style={styles.avatarPhoto}
                  contentFit="cover"
                />
              ) : familySettings.family_avatar_url && isEmojiAvatar(familySettings.family_avatar_url) ? (
                // Legacy emoji avatar
                <Text style={styles.avatarEmoji}>{familySettings.family_avatar_url}</Text>
              ) : (
                // Fallback: first letter of family or user name
                <Text style={styles.avatarText}>
                  {(familySettings.family_name || userSettings.display_name).charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.avatarCameraButton}
              onPress={pickFamilyAvatar}
              activeOpacity={0.8}
            >
              <Camera size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {editingFamilyName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.nameInput}
                value={familyNameDraft}
                onChangeText={setFamilyNameDraft}
                autoFocus
                onBlur={() => {
                  if (familyNameDraft.trim()) {
                    updateFamilySettings({ family_name: familyNameDraft.trim() });
                  }
                  setEditingFamilyName(false);
                }}
                testID="edit-family-name"
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => isAdmin && setEditingFamilyName(true)}>
              <Text style={styles.displayName}>
                {familySettings.family_name || 'Your Family'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.role}>
            {isAdmin ? 'Admin' : 'Member'}
          </Text>
        </View>

        {/* Emoji picker removed — tap the camera icon to pick a real photo */}

        {/* Family Members */}
        <View style={styles.membersList}>
          {familyMembers.map((member) => (
            <View key={member.user_id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {member.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.display_name}</Text>
                <View style={styles.memberTags}>
                  <View style={[styles.roleBadge, member.is_admin && styles.adminBadge]}>
                    <Text style={[styles.roleBadgeText, member.is_admin && styles.adminBadgeText]}>
                      {member.is_admin ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                  {member.dietary_preferences.slice(0, 2).map(p => (
                    <View key={p} style={styles.prefTag}>
                      <Text style={styles.prefTagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        <PrimaryButton
          label="Invite New Member — Coming soon"
          onPress={() => console.log('[Settings] Invite member')}
          variant="secondary"
          style={{ marginTop: 8 }}
          disabled={true}
          testID="invite-member"
        />

        {/* Meal Slots */}
        <SectionHeader
          title="Meal Slots"
          locked={!isAdmin}
          adminName={adminName}
        />
        {!showMealSlots ? (
          <Card>
            <SettingRow
              icon={<UtensilsCrossed size={18} color={Colors.primary} />}
              label="Your Daily Meal Slots"
              value={slotNames || 'Not configured'}
              onPress={isAdmin ? () => {
                setMealSlotsDraft([...familySettings.meal_slots]);
                setShowMealSlots(true);
              } : undefined}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardHelper}>
              Rename, reorder, remove, or add new ones. Changes apply across the whole app.
            </Text>
            <MealSlotEditor
              slots={mealSlotsDraft}
              onSlotsChange={setMealSlotsDraft}
              showDragHandle
            />
            <View style={styles.cardActions}>
              <PrimaryButton
                label="Save Changes"
                onPress={handleSaveMealSlots}
                testID="save-slots"
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMealSlots(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Family Size */}
        <SectionHeader title="Family Size" />
        {!showHousehold ? (
          <Card>
            <SettingRow
              icon={<Users size={18} color={Colors.primary} />}
              label="How many people are in your family?"
              value={`${familySettings.default_serving_size} servings`}
              onPress={() => setShowHousehold(true)}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardHelper}>
              This is used as the default serving size for every meal. You can always override it per meal in your plan.
            </Text>
            <View style={{ paddingVertical: 16 }}>
              <Stepper
                value={familySettings.default_serving_size}
                onValueChange={(val) => updateFamilySettings({ default_serving_size: val })}
                min={1}
                max={20}
              />
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowHousehold(false)}
            >
              <Text style={styles.cancelText}>Done</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Dietary Preferences */}
        <SectionHeader
          title="Dietary Preferences"
          locked={!isAdmin}
          adminName={adminName}
        />
        {!(showFamilyDietary || showPersonalDietary) ? (
          <Card>
            <SettingRow
              icon={<Leaf size={18} color={Colors.primary} />}
              label="Dietary Preferences"
              value={[...familySettings.dietary_preferences_family, ...userSettings.dietary_preferences_individual].length > 0
                ? [...familySettings.dietary_preferences_family, ...userSettings.dietary_preferences_individual].join(', ')
                : 'None set'}
              onPress={() => setShowFamilyDietary(true)}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.dietarySubLabel}>Family preferences</Text>
            <DietaryPillGrid
              selected={familySettings.dietary_preferences_family}
              onSelectionChange={(prefs) => updateFamilySettings({ dietary_preferences_family: prefs })}
            />
            <View style={{ height: 16 }} />
            <Text style={styles.dietarySubLabel}>Your preferences</Text>
            <DietaryPillGrid
              selected={userSettings.dietary_preferences_individual}
              onSelectionChange={(prefs) => updateUserSettings({ dietary_preferences_individual: prefs })}
            />
            <Text style={styles.dietaryHelperText}>
              Smart Fill uses these to filter out meals that don't suit your family.
            </Text>
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 16 }]}
              onPress={() => { setShowFamilyDietary(false); setShowPersonalDietary(false); }}
            >
              <Text style={styles.cancelText}>Done</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Smart Fill */}
        <SectionHeader
          title="Smart Fill"
          icon={<Sparkles size={16} color={Colors.textSecondary} />}
        />
        <Card>
          <View style={styles.smartFillRow}>
            <Text style={styles.smartFillLabel}>How adventurous should Smart Fill be?</Text>
            <Text style={styles.smartFillSub}>
              Controls how many new meals are mixed in vs. meals you already know and love.
            </Text>
          </View>
          <View style={styles.noveltyToggle}>
            {([
              { label: '🏠 Familiar', sub: 'Mostly meals you know', pct: 10 },
              { label: '⚖️ Balanced', sub: 'Mix of new & familiar', pct: 30 },
              { label: '🌍 Adventurous', sub: 'Lots of new meals', pct: 50 },
            ] as const).map((opt) => {
              const active = (familySettings.smart_fill_novelty_pct ?? 30) === opt.pct;
              return (
                <TouchableOpacity
                  key={opt.pct}
                  style={[styles.noveltyOption, active && styles.noveltyOptionActive]}
                  onPress={() => updateFamilySettings({ smart_fill_novelty_pct: opt.pct })}
                >
                  <Text style={[styles.noveltyOptionLabel, active && styles.noveltyOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.noveltyOptionSub, active && styles.noveltyOptionSubActive]}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <Card>
          <SwitchRow
            label="Weekly planning reminder"
            value={notificationSettings.weekly_reminder}
            onValueChange={(val) => updateNotificationSettings({ weekly_reminder: val })}
          />
          <SwitchRow
            label="Shopping list reminder"
            value={notificationSettings.shopping_reminder}
            onValueChange={(val) => updateNotificationSettings({ shopping_reminder: val })}
          />
        </Card>

        {/* App Preferences */}
        <SectionHeader title="App Preferences" />
        <Card>
          <SettingRow
            icon={<Globe size={18} color={Colors.primary} />}
            label="Language"
            value={familySettings.language || 'English'}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          />
          {showLanguagePicker && (
            <View>
              {['English', 'Français', 'Español', 'Deutsch', 'Português', 'Italiano'].map((lang) => {
                const isSelected = (familySettings.language || 'English') === lang;
                return (
                  <TouchableOpacity
                    key={lang}
                    style={styles.pickerOption}
                    onPress={() => {
                      updateFamilySettings({ language: lang });
                      setShowLanguagePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>{lang}</Text>
                    {isSelected && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <SettingRow
            icon={<Globe size={18} color={Colors.primary} />}
            label="Region"
            value={familySettings.region || 'US'}
            onPress={() => setShowRegionPicker(!showRegionPicker)}
          />
          {showRegionPicker && (
            <View>
              {['US', 'UK', 'CA', 'AU', 'NZ', 'FR', 'DE', 'ES', 'IT', 'JP'].map((reg) => {
                const isSelected = (familySettings.region || 'US') === reg;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={styles.pickerOption}
                    onPress={() => {
                      updateFamilySettings({ region: reg });
                      setShowRegionPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>{reg}</Text>
                    {isSelected && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={styles.unitsRow}>
            <View style={rowStyles.left}>
              <View style={rowStyles.iconWrap}>
                <Ruler size={18} color={Colors.primary} />
              </View>
              <Text style={rowStyles.label}>Measurement Units</Text>
            </View>
            <View style={styles.unitsToggle}>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  familySettings.measurement_units === 'metric' && styles.unitActive,
                ]}
                onPress={() => updateFamilySettings({ measurement_units: 'metric' })}
              >
                <Text style={[
                  styles.unitText,
                  familySettings.measurement_units === 'metric' && styles.unitTextActive,
                ]}>Metric</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  familySettings.measurement_units === 'imperial' && styles.unitActive,
                ]}
                onPress={() => updateFamilySettings({ measurement_units: 'imperial' })}
              >
                <Text style={[
                  styles.unitText,
                  familySettings.measurement_units === 'imperial' && styles.unitTextActive,
                ]}>Imperial</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* My Account */}
        <SectionHeader title="My Account" />
        <Card>
          {editingDisplayName ? (
            <View style={styles.editAccountRow}>
              <TextInput
                style={styles.accountInput}
                value={displayNameDraft}
                onChangeText={setDisplayNameDraft}
                autoFocus
                placeholder="Display name"
                placeholderTextColor={Colors.inactive}
                onBlur={() => {
                  if (displayNameDraft.trim()) {
                    updateUserSettings({ display_name: displayNameDraft.trim() });
                  }
                  setEditingDisplayName(false);
                }}
                testID="edit-display-name"
              />
            </View>
          ) : (
            <SettingRow
              icon={<User size={18} color={Colors.primary} />}
              label="Display Name"
              value={userSettings.display_name}
              onPress={() => {
                setDisplayNameDraft(userSettings.display_name);
                setEditingDisplayName(true);
              }}
            />
          )}

          <SettingRow
            icon={<Lock size={18} color={Colors.primary} />}
            label="Email"
            value={userSettings.email || 'Sign in to add email'}
          />

          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} testID="sign-out">
            <LogOut size={18} color={Colors.warning} strokeWidth={2} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerRow}
            onPress={() => setShowAccount(!showAccount)}
          >
            <Trash2 size={18} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.dangerText}>Delete Account</Text>
          </TouchableOpacity>

          {showAccount && (
            <View style={styles.deleteConfirm}>
              <Text style={styles.deleteWarning}>
                This action is permanent. Type DELETE to confirm.
              </Text>
              <TextInput
                style={styles.deleteInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type DELETE"
                placeholderTextColor={Colors.inactive}
                autoCapitalize="characters"
                testID="delete-confirm-input"
              />
              <PrimaryButton
                label="Delete My Account"
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                testID="delete-account-btn"
              />
            </View>
          )}
        </Card>

        {/* Admin Settings */}
        {isAdmin && (
          <>
            <SectionHeader title="Admin Settings" />
            <Card style={{ borderWidth: 1, borderColor: Colors.warning }}>
              <SettingRow
                icon={<Shield size={18} color={Colors.warning} />}
                label="Transfer Admin Rights"
                value="Select a member"
                rightContent={
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming soon</Text>
                  </View>
                }
              />
              <TouchableOpacity
                style={styles.dangerRow}
                onPress={() => setShowAdminSettings(!showAdminSettings)}
              >
                <Trash2 size={18} color={Colors.danger} strokeWidth={2} />
                <Text style={styles.dangerText}>Delete Family Account</Text>
              </TouchableOpacity>

              {showAdminSettings && (
                <View style={styles.deleteConfirm}>
                  <Text style={styles.deleteWarning}>
                    All members will be signed out. This cannot be undone. Type DELETE to confirm.
                  </Text>
                  <TextInput
                    style={styles.deleteInput}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholder="Type DELETE"
                    placeholderTextColor={Colors.inactive}
                    autoCapitalize="characters"
                    testID="delete-family-confirm"
                  />
                  <PrimaryButton
                    label="Delete Family Account"
                    onPress={handleDeleteFamily}
                    disabled={deleteConfirmText !== 'DELETE'}
                    testID="delete-family-btn"
                  />
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    ...Shadows.header,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
  },
  avatarPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarCameraButton: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  displayName: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  editNameRow: {
    marginBottom: 6,
  },
  nameInput: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    textAlign: 'center',
    minWidth: 200,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  membersList: {
    marginTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  memberTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: Colors.primaryLight,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  adminBadgeText: {
    color: Colors.primary,
  },
  prefTag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prefTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  cardHelper: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardActions: {
    marginTop: 16,
    gap: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  pantryInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pantryInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pantryAddButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.input,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pantryAddDisabled: {
    opacity: 0.4,
  },
  emptyPantry: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  pantryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pantryItemInfo: {
    flex: 1,
  },
  pantryItemName: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  pantryItemCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pantryRemove: {
    padding: 8,
  },

  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  unitsToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  unitActive: {
    backgroundColor: Colors.primary,
  },
  unitText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  unitTextActive: {
    color: Colors.white,
  },
  smartFillRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: 14,
  },
  smartFillLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  smartFillSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noveltyToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  noveltyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  noveltyOptionActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  noveltyOptionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  noveltyOptionLabelActive: {
    color: Colors.primary,
  },
  noveltyOptionSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  noveltyOptionSubActive: {
    color: Colors.primary,
  },
  editAccountRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  accountInput: {
    fontSize: 16,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  dangerText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  deleteConfirm: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  deleteWarning: {
    fontSize: 13,
    color: Colors.warning,
    lineHeight: 19,
  },
  deleteInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dietarySubLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  dietaryHelperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    marginTop: 16,
    lineHeight: 17,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  comingSoonBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emojiPickerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  emojiOption: {
    width: 60,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  emojiText: {
    fontSize: 36,
  },
  emojiRemoveLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  emojiRemoveText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
