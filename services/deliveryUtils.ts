import { Linking } from 'react-native';

export type DeliveryPlatform = 'uber_eats' | 'zomato' | 'grab' | 'swiggy' | 'deliveroo' | 'doordash' | 'other';

export function detectPlatformFromUrl(url: string): DeliveryPlatform | null {
  if (url.includes('ubereats.com') || url.includes('uber.com/eats')) return 'uber_eats';
  if (url.includes('zomato.com')) return 'zomato';
  if (url.includes('grab.com') || url.includes('food.grab')) return 'grab';
  if (url.includes('swiggy.com')) return 'swiggy';
  if (url.includes('deliveroo.com')) return 'deliveroo';
  if (url.includes('doordash.com')) return 'doordash';
  return null;
}

export function getPlatformLabel(platform: DeliveryPlatform | null): string {
  switch (platform) {
    case 'uber_eats': return 'Uber Eats';
    case 'zomato': return 'Zomato';
    case 'grab': return 'Grab Food';
    case 'swiggy': return 'Swiggy';
    case 'deliveroo': return 'Deliveroo';
    case 'doordash': return 'DoorDash';
    case 'other': return 'Delivery app';
    default: return 'Delivery link';
  }
}

/**
 * Convert a hyphen-separated URL slug into a human-readable name.
 * e.g. "mcdonalds-new-friends-colony" → "Mcdonalds New Friends Colony"
 */
function slugToName(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Attempt to extract a restaurant/meal name from a delivery app URL.
 * Returns null if the URL is unrecognised or parsing fails.
 *
 * Supported platforms and their URL patterns:
 *   Uber Eats  — /store/[restaurant-slug]/[uuid]
 *   Zomato     — /[city]/[restaurant-slug]/order
 *   Swiggy     — /city/[city]/[slug]-rest[id]
 *   Deliveroo  — /menu/[city]/[area]/[restaurant-slug]
 *   Grab       — /restaurant/[slug]-[GRAB_ID]
 *   DoorDash   — /store/[restaurant-slug]/[id]
 */
export function extractNameFromDeliveryUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);

    // Uber Eats: ubereats.com/store/[slug]/[uuid]
    if (url.includes('ubereats.com') || url.includes('uber.com/eats')) {
      const idx = segments.indexOf('store');
      if (idx >= 0 && segments[idx + 1]) {
        // Strip trailing UUID-like segment (hex chars and hyphens)
        const slug = segments[idx + 1].replace(/-[a-f0-9]{8,}$/i, '');
        return slugToName(slug);
      }
    }

    // Zomato: zomato.com/[city]/[slug]/order  OR  /[country]/[city]/[slug]/order
    if (url.includes('zomato.com')) {
      const orderIdx = segments.indexOf('order');
      if (orderIdx > 0) return slugToName(segments[orderIdx - 1]);
      // Fallback: last non-empty segment
      const last = segments[segments.length - 1];
      if (last && last !== 'zomato.com') return slugToName(last);
    }

    // Swiggy: swiggy.com/city/[city]/[slug]-rest[digits]
    if (url.includes('swiggy.com')) {
      const last = segments[segments.length - 1];
      if (last) {
        const slug = last.replace(/-rest\d+$/i, '');
        return slugToName(slug);
      }
    }

    // Deliveroo: deliveroo.com[.au/.co.uk]/menu/[city]/[area]/[slug]
    if (url.includes('deliveroo.com')) {
      const menuIdx = segments.indexOf('menu');
      const slugSeg = menuIdx >= 0 ? segments[menuIdx + 3] : segments[segments.length - 1];
      if (slugSeg) return slugToName(slugSeg);
    }

    // Grab: food.grab.com/.../restaurant/[slug]-[GRAB_UPPERCASE_ID]
    if (url.includes('grab.com') || url.includes('food.grab')) {
      const idx = segments.indexOf('restaurant');
      if (idx >= 0 && segments[idx + 1]) {
        // Strip trailing Grab ID (all-caps alphanumeric after last hyphen)
        const slug = segments[idx + 1].replace(/-[A-Z0-9_-]{6,}$/i, '');
        return slugToName(slug);
      }
    }

    // DoorDash: doordash.com/store/[slug]/[id]
    if (url.includes('doordash.com')) {
      const idx = segments.indexOf('store');
      if (idx >= 0 && segments[idx + 1]) {
        return slugToName(segments[idx + 1]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function openDeliveryLink(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(url);
    }
  } catch {
    await Linking.openURL(url);
  }
}
