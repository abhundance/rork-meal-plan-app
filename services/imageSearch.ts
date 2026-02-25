function getUnsplashKey(): string {
  const key = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('Unsplash access key not configured. Add EXPO_PUBLIC_UNSPLASH_ACCESS_KEY to environment variables.');
  return key;
}

export interface UnsplashImage {
  id: string;
  regularUrl: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
}

export async function searchFoodImages(mealName: string): Promise<UnsplashImage[]> {
  if (!mealName || mealName.length < 3) return [];

  try {
    const key = getUnsplashKey();
    const query = encodeURIComponent(mealName + ' food meal');
    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=6&orientation=landscape&client_id=${key}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn('[imageSearch] Unsplash returned non-200:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results;
    if (!results || results.length === 0) return [];

    return results.map((result: any): UnsplashImage => ({
      id: result.id,
      regularUrl: result.urls.regular,
      thumbUrl: result.urls.thumb,
      photographer: result.user.name,
      photographerUrl: result.user.links.html,
    }));
  } catch (err) {
    console.warn('[imageSearch] Error fetching images:', err);
    return [];
  }
}
