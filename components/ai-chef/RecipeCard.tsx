/**
 * RecipeCard — Displays an AI Chef recipe result with expandable
 * ingredients/steps and quick-refine suggestion chips.
 *
 * Extracted from AiChefChat to preserve expand/collapse state across
 * parent re-renders (component identity is stable).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { ExtractedRecipe } from '@/services/recipeExtraction';
import { REFINE_SUGGESTIONS } from './constants';
import styles from './styles';

interface RecipeCardProps {
  recipe: ExtractedRecipe;
  changesSummary?: string;
  onSave: (recipe: ExtractedRecipe) => void;
  onRefine: (suggestion?: string) => void;
}

export default function RecipeCard({ recipe, changesSummary, onSave, onRefine }: RecipeCardProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showRefineChips, setShowRefineChips] = useState(false);

  const toggleIngredients = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowIngredients(!showIngredients);
  };
  const toggleSteps = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSteps(!showSteps);
  };
  const toggleRefineChips = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRefineChips(!showRefineChips);
  };

  return (
    <View style={styles.recipeCard}>
      <View style={styles.recipeHeader}>
        <View style={styles.recipeEmojiContainer}>
          <Text style={styles.recipeEmoji}>🍽️</Text>
        </View>
        <View style={styles.recipeHeaderText}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          {recipe.description ? (
            <Text style={styles.recipeDescription} numberOfLines={2}>{recipe.description}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.recipeMetaRow}>
        {recipe.prep_time ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>⏱ {recipe.prep_time + (recipe.cook_time || 0)} min</Text>
          </View>
        ) : null}
        {recipe.recipe_serving_size ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>👥 {recipe.recipe_serving_size} servings</Text>
          </View>
        ) : null}
        {recipe.cuisine ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{recipe.cuisine}</Text>
          </View>
        ) : null}
      </View>

      {recipe.dietary_tags?.length > 0 && (
        <View style={styles.dietaryRow}>
          {recipe.dietary_tags.map((tag, i) => (
            <View key={i} style={styles.dietaryChip}>
              <Text style={styles.dietaryChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {changesSummary ? (
        <View style={styles.changesSummary}>
          <Text style={styles.changesSummaryText}>✏️ {changesSummary}</Text>
        </View>
      ) : null}

      {recipe.ingredients?.length > 0 && (
        <View>
          <TouchableOpacity
            style={styles.expandableHeader}
            onPress={toggleIngredients}
            activeOpacity={0.7}
          >
            <Text style={styles.expandableTitle}>
              Ingredients ({recipe.ingredients.length})
            </Text>
            {showIngredients ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          {showIngredients && (
            <View style={styles.ingredientsList}>
              {recipe.ingredients.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>
                  • {ing.quantity} {ing.unit} {ing.name}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {recipe.method_steps?.length > 0 && (
        <View>
          <TouchableOpacity
            style={styles.expandableHeader}
            onPress={toggleSteps}
            activeOpacity={0.7}
          >
            <Text style={styles.expandableTitle}>
              Method ({recipe.method_steps.length} steps)
            </Text>
            {showSteps ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          {showSteps && (
            <View style={styles.stepsList}>
              {recipe.method_steps.map((step, i) => (
                <View key={i} style={styles.stepItem}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.recipeActions}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onSave(recipe)}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refineButton}
          onPress={toggleRefineChips}
          activeOpacity={0.7}
        >
          <Text style={styles.refineButtonText}>
            {showRefineChips ? 'Hide Options' : 'Refine'}
          </Text>
        </TouchableOpacity>
      </View>

      {showRefineChips && (
        <View style={styles.refineChipsContainer}>
          <View style={styles.refineChipsWrap}>
            {REFINE_SUGGESTIONS.map((suggestion, i) => (
              <TouchableOpacity
                key={i}
                style={styles.refineChip}
                onPress={() => {
                  setShowRefineChips(false);
                  onRefine(suggestion);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.refineChipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.refineCustomBtn}
            onPress={() => {
              setShowRefineChips(false);
              onRefine();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.refineCustomBtnText}>Type your own change...</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
