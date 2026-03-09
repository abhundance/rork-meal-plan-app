export const SlotColors = [
  { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  { bg: '#EDE9FE', text: '#4C1D95', dot: '#7B68CC' },
  { bg: '#FFEDD5', text: '#7C2D12', dot: '#F97316' },
  { bg: '#DBEAFE', text: '#1E3A8A', dot: '#3B82F6' },
  { bg: '#FCE7F3', text: '#831843', dot: '#EC4899' },
  { bg: '#CCFBF1', text: '#134E4A', dot: '#14B8A6' },
];

export default {
  // Primary — Supreme Red
  primary: '#ED1C16',          // interactive: buttons, icons, active states, CTAs (4.41:1 on white — use on large UI elements)
  primaryVibrant: '#F53530',   // decorative only: hero fills, card tints, filled hearts
  primaryLight: '#FEF0EE',     // selected chip bg, highlights, icon container bg

  // Family placeholder gradient — used by MealImagePlaceholder for family-created meals.
  // Derived from primary. Update all three values whenever primary changes.
  familyGradient: ['#FEF0EE', '#FDDAD8', '#FCC8C5'] as [string, string, string],

  // Surfaces — intentionally neutral so the red accent pops rather than bleeds
  background: '#FFFFFF',       // page background (pure white — Supreme aesthetic)
  surface: '#F5F5F5',          // input bg, chip default bg (visibly distinct from white bg)
  card: '#FFFFFF',             // card backgrounds (elevation via shadow, not color)

  // Text
  text: '#2C2C2C',             // primary text
  textSecondary: '#6B7280',    // metadata, helper text, timestamps (4.61:1 on white ✅)

  // Status
  success: '#8BAF7A',
  warning: '#D4A853',
  // danger is a darker crimson so it remains visually distinct from the bright primary red
  danger: '#B91C1C',

  // Utility
  white: '#FFFFFF',
  border: '#E0E0E0',           // slightly crisper on white background
  shadow: '#ED1C16',           // red-tinted card/tab shadows
  inactive: 'rgba(44, 44, 44, 0.4)',
  skeleton1: '#F5DCDA',        // warm red-tinted skeleton base
  skeleton2: '#FEF0EE',        // skeleton shimmer highlight
  offlineBanner: '#F5E6C8',
  offlineText: '#8B6914',
  divider: '#E0E0E0',          // neutral (no red tint)
  overlay: 'rgba(0, 0, 0, 0.3)',
};
