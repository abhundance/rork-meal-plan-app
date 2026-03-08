import React, { useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { GripVertical, X, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import { MealSlot } from '@/types';

interface MealSlotEditorProps {
  slots: MealSlot[];
  onSlotsChange: (slots: MealSlot[]) => void;
  showDragHandle?: boolean;
}

function SlotRow({
  slot,
  canRemove,
  onRename,
  onRemove,
  showDragHandle,
  autoFocus,
}: {
  slot: MealSlot;
  canRemove: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  showDragHandle: boolean;
  autoFocus?: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleRemove = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onRemove());
  }, [fadeAnim, onRemove]);

  return (
    <Animated.View style={[styles.slotRow, { opacity: fadeAnim }]}>
      {showDragHandle && (
        <View style={styles.dragHandle}>
          <GripVertical size={18} color={Colors.inactive} strokeWidth={2} />
        </View>
      )}
      <TextInput
        style={styles.slotInput}
        value={slot.name}
        onChangeText={onRename}
        placeholder="Meal name"
        placeholderTextColor={Colors.inactive}
        autoFocus={autoFocus}
        testID={`slot-input-${slot.slot_id}`}
      />
      <TouchableOpacity
        style={[styles.removeButton, !canRemove && styles.removeDisabled]}
        onPress={handleRemove}
        disabled={!canRemove}
        testID={`slot-remove-${slot.slot_id}`}
      >
        <X size={16} color={canRemove ? Colors.textSecondary : Colors.inactive} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MealSlotEditor({ slots, onSlotsChange, showDragHandle = false }: MealSlotEditorProps) {
  const [newSlotId, setNewSlotId] = React.useState<string | null>(null);

  const handleRename = useCallback((slotId: string, name: string) => {
    const updated = slots.map(s => s.slot_id === slotId ? { ...s, name } : s);
    onSlotsChange(updated);
  }, [slots, onSlotsChange]);

  const handleRemove = useCallback((slotId: string) => {
    const filtered = slots.filter(s => s.slot_id !== slotId);
    const reordered = filtered.map((s, i) => ({ ...s, order: i }));
    onSlotsChange(reordered);
  }, [slots, onSlotsChange]);

  const handleAdd = useCallback(() => {
    const id = `slot_${Date.now()}`;
    const newSlot: MealSlot = {
      slot_id: id,
      name: '',
      order: slots.length,
    };
    setNewSlotId(id);
    onSlotsChange([...slots, newSlot]);
  }, [slots, onSlotsChange]);

  return (
    <View style={styles.container}>
      {slots.sort((a, b) => a.order - b.order).map((slot) => (
        <SlotRow
          key={slot.slot_id}
          slot={slot}
          canRemove={slots.length > 1}
          onRename={(name) => handleRename(slot.slot_id, name)}
          onRemove={() => handleRemove(slot.slot_id)}
          showDragHandle={showDragHandle}
          autoFocus={slot.slot_id === newSlotId}
        />
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAdd} testID="add-meal-slot">
        <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
        <Text style={styles.addLabel}>Add a meal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingRight: 8,
    gap: 4,
  },
  dragHandle: {
    paddingLeft: 12,
    paddingVertical: 14,
  },
  slotInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDisabled: {
    opacity: 0.3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
