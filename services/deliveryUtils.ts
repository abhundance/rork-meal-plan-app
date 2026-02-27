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
