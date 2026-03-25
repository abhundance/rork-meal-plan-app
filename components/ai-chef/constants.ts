/**
 * Static content for the AI Chef chat: inspiration cards, refinement suggestions.
 */

import Colors from '@/constants/colors';

export const INSPIRATIONS = [
  {
    icon: '💬',
    bgColor: Colors.inspirationTintRed,
    text: '"I have chicken and rice, need something quick"',
    subtitle: 'Describe ingredients or cravings',
  },
  {
    icon: '🔗',
    bgColor: Colors.inspirationTintBlue,
    text: 'Paste a YouTube, TikTok, or blog link',
    subtitle: 'Extracts full recipe from any URL',
  },
  {
    icon: '📷',
    bgColor: Colors.inspirationTintGreen,
    text: 'Snap a photo of a recipe or menu',
    subtitle: 'AI reads and structures the recipe',
  },
  {
    icon: '🎤',
    bgColor: Colors.inspirationTintOrange,
    text: 'Speak your recipe or describe a dish',
    subtitle: 'Voice to structured recipe',
  },
  {
    icon: '📄',
    bgColor: Colors.inspirationTintSky,
    text: 'Attach a recipe PDF or document',
    subtitle: 'Extract recipes from files',
  },
  {
    icon: '🍽️',
    bgColor: Colors.inspirationTintPurple,
    text: '"A lighter version of Butter Chicken"',
    subtitle: 'Modify or reinvent any dish',
  },
];

export const REFINE_SUGGESTIONS = [
  'Make it spicier',
  'Fewer ingredients',
  'Make it vegetarian',
  'Quicker version',
  'Make it healthier',
  'Kid-friendly version',
  'Double the servings',
  'Make it gluten-free',
];
