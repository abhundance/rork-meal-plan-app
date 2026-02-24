import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import FilterPill from './FilterPill';
import { DIETARY_OPTIONS } from '@/types';

interface DietaryPillGridProps {
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
}

export default function DietaryPillGrid({ selected, onSelectionChange }: DietaryPillGridProps) {
  const handleToggle = useCallback((option: string) => {
    if (option === 'No Restrictions') {
      if (selected.includes('No Restrictions')) {
        onSelectionChange([]);
      } else {
        onSelectionChange(['No Restrictions']);
      }
      return;
    }

    const withoutNoRestrictions = selected.filter(s => s !== 'No Restrictions');
    if (withoutNoRestrictions.includes(option)) {
      onSelectionChange(withoutNoRestrictions.filter(s => s !== option));
    } else {
      onSelectionChange([...withoutNoRestrictions, option]);
    }
  }, [selected, onSelectionChange]);

  return (
    <View style={styles.grid}>
      {DIETARY_OPTIONS.map((option) => (
        <FilterPill
          key={option}
          label={option}
          active={selected.includes(option)}
          onPress={() => handleToggle(option)}
          testID={`dietary-${option}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
