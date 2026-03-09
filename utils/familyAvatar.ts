/**
 * Derives 1–2 initials from a family name.
 * Strips common stop words then takes the first letter of the first word
 * and (if present) the first letter of the last word, uppercased.
 *
 * Examples:  "Smith Family" → "SF",  "The Johnsons" → "J",  "" → "F"
 */
export function getFamilyInitials(familyName: string): string {
  const stopWords = new Set(['the', 'and', 'our', 'my', '&', 'a']);
  const words = familyName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));
  if (words.length === 0) return 'F'; // "F" for Family when no name is set
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Returns true if the string is a short emoji rather than a real photo URI */
export function isEmojiAvatar(value: string): boolean {
  return value.length <= 4 && /^\p{Emoji}/u.test(value);
}

/** Returns true if the string is a real photo URI (http, https, file://) */
export function isRealPhotoUrl(value: string | undefined): value is string {
  return (
    !!value &&
    (value.startsWith('http') || value.startsWith('file://'))
  );
}
