import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import {
  ChevronLeft, Lock, Users, UtensilsCrossed, Ruler, Leaf,
  ShoppingBasket, Bell, Globe, LogOut, Trash2, Shield,
  UserPlus, Plus, X, ChevronRight, Sparkles,
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
import { PantryItem, MealSlot, PANTRY_CATEGORIES } from '@/types';

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
    updateMealSlots, addPantryItem, removePantryItem,
  } = useFamilySettings();

  const isAdmin = userSettings.is_admin;
  const adminName = familyMembers.find(m => m.is_admin)?.display_name ?? 'Admin';

  const [showMealSlots, setShowMealSlots] = useState<boolean>(false);
  const [showHousehold, setShowHousehold] = useState<boolean>(false);
  const [showPantry, setShowPantry] = useState<boolean>(false);
  const [showFamilyDietary, setShowFamilyDietary] = useState<boolean>(false);
  const [showPersonalDietary, setShowPersonalDietary] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showAccount, setShowAccount] = useState<boolean>(false);
  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false);

  const [pantryInput, setPantryInput] = useState<string>('');
  const [pantryCategory, setPantryCategory] = useState<string>('Other');
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [editingFamilyName, setEditingFamilyName] = useState<boolean>(false);
  const [familyNameDraft, setFamilyNameDraft] = useState<string>(familySettings.family_name);
  const [editingDisplayName, setEditingDisplayName] = useState<boolean>(false);
  const [displayNameDraft, setDisplayNameDraft] = useState<string>(userSettings.display_name);

  const [mealSlotsDraft, setMealSlotsDraft] = useState<MealSlot[]>(familySettings.meal_slots);

  const handleAddPantryItem = useCallback(() => {
    if (!pantryInput.trim()) return;
    const item: PantryItem = {
      id: `pantry_${Date.now()}`,
      name: pantryInput.trim(),
      category: pantryCategory,
    };
    addPantryItem(item);
    setPantryInput('');
    console.log('[Settings] Added pantry item:', item.name);
  }, [pantryInput, pantryCategory, addPantryItem]);

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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(familySettings.family_name || userSettings.display_name).charAt(0).toUpperCase()}
            </Text>
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
          label="Invite New Member"
          onPress={() => console.log('[Settings] Invite member')}
          variant="secondary"
          style={{ marginTop: 8 }}
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

        {/* Household & Serving Size */}
        <SectionHeader title="Household & Serving Size" />
        {!showHousehold ? (
          <Card>
            <SettingRow
              icon={<Users size={18} color={Colors.primary} />}
              label="Default Serving Size"
              value={`${familySettings.default_serving_size} servings`}
              onPress={() => setShowHousehold(true)}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardHelper}>
              This is the default serving size applied to every meal slot. Override it per meal in your plan.
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

        {/* Pantry */}
        <SectionHeader title="Pantry — We Already Have" />
        <Card>
          <Text style={styles.cardHelper}>
            Items here are automatically marked as "Already have this" in your shopping list.
          </Text>
          <View style={styles.pantryInputRow}>
            <TextInput
              style={styles.pantryInput}
              value={pantryInput}
              onChangeText={setPantryInput}
              placeholder="Add a pantry item..."
              placeholderTextColor={Colors.inactive}
              returnKeyType="done"
              onSubmitEditing={handleAddPantryItem}
              testID="pantry-input"
            />
            <TouchableOpacity
              style={[styles.pantryAddButton, !pantryInput.trim() && styles.pantryAddDisabled]}
              onPress={handleAddPantryItem}
              disabled={!pantryInput.trim()}
            >
              <Plus size={18} color={Colors.white} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {familySettings.pantry_items.length === 0 ? (
            <Text style={styles.emptyPantry}>No pantry items yet</Text>
          ) : (
            familySettings.pantry_items.map((item) => (
              <View key={item.id} style={styles.pantryRow}>
                <View style={styles.pantryItemInfo}>
                  <Text style={styles.pantryItemName}>{item.name}</Text>
                  <Text style={styles.pantryItemCategory}>{item.category}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removePantryItem(item.id)}
                  style={styles.pantryRemove}
                >
                  <X size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {/* Dietary Preferences */}
        <SectionHeader
          title="Family Dietary Preferences"
          locked={!isAdmin}
          adminName={adminName}
        />
        {!showFamilyDietary ? (
          <Card>
            <SettingRow
              icon={<Leaf size={18} color={Colors.primary} />}
              label="Family Preferences"
              value={familySettings.dietary_preferences_family.length > 0
                ? familySettings.dietary_preferences_family.join(', ')
                : 'None set'}
              onPress={isAdmin ? () => setShowFamilyDietary(true) : undefined}
            />
          </Card>
        ) : (
          <Card>
            <DietaryPillGrid
              selected={familySettings.dietary_preferences_family}
              onSelectionChange={(prefs) => updateFamilySettings({ dietary_preferences_family: prefs })}
            />
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 16 }]}
              onPress={() => setShowFamilyDietary(false)}
            >
              <Text style={styles.cancelText}>Done</Text>
            </TouchableOpacity>
          </Card>
        )}

        <SectionHeader title="Your Personal Preferences" />
        {!showPersonalDietary ? (
          <Card>
            <SettingRow
              icon={<Leaf size={18} color={Colors.primary} />}
              label="Personal Preferences"
              value={userSettings.dietary_preferences_individual.length > 0
                ? userSettings.dietary_preferences_individual.join(', ')
                : 'None set'}
              onPress={() => setShowPersonalDietary(true)}
            />
          </Card>
        ) : (
          <Card>
            <DietaryPillGrid
              selected={userSettings.dietary_preferences_individual}
              onSelectionChange={(prefs) => updateUserSettings({ dietary_preferences_individual: prefs })}
            />
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 16 }]}
              onPress={() => setShowPersonalDietary(false)}
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
          />
          <SettingRow
            icon={<Globe size={18} color={Colors.primary} />}
            label="Region"
            value={familySettings.region || 'US'}
          />
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
              icon={<Users size={18} color={Colors.primary} />}
              label="Display Name"
              value={userSettings.display_name}
              onPress={() => {
                setDisplayNameDraft(userSettings.display_name);
                setEditingDisplayName(true);
              }}
            />
          )}

          <SettingRow
            icon={<Globe size={18} color={Colors.primary} />}
            label="Email"
            value={userSettings.email || 'Not set'}
          />

          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} testID="sign-out">
            <LogOut size={18} color={Colors.warning} strokeWidth={2} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerRow}
            onPress={() => setShowAccount(!showAccount)}
          >
            <Trash2 size={18} color="#D4534D" strokeWidth={2} />
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
            <Card style={{ borderWidth: 1, borderColor: Colors.offlineBanner }}>
              <SettingRow
                icon={<Shield size={18} color={Colors.warning} />}
                label="Transfer Admin Rights"
                value="Select a member"
                onPress={() => console.log('[Settings] Transfer admin')}
              />
              <TouchableOpacity
                style={styles.dangerRow}
                onPress={() => setShowAdminSettings(!showAdminSettings)}
              >
                <Trash2 size={18} color="#D4534D" strokeWidth={2} />
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
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.white,
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
    color: '#D4534D',
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
});
