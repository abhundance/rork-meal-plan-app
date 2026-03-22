export type InputType = 'empty' | 'url' | 'name' | 'conversation';
export type UrlSource = { icon: string; label: string; type: 'youtube' | 'tiktok' | 'instagram' | 'blog' };

export function detectInputType(text: string): InputType {
  const trimmed = text.trim();
  if (!trimmed) return 'empty';
  if (/^https?:\/\/.+/i.test(trimmed)) return 'url';
  const words = trimmed.split(/\s+/).length;
  const isConversation = /[?]|I have|I want|I need|help me|suggest|something|what can|could you|make me|feeling|recommend/i.test(trimmed);
  if (isConversation || words >= 7) return 'conversation';
  return 'name';
}

export function detectUrlSource(url: string): UrlSource {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { icon: '🎬', label: 'YouTube video', type: 'youtube' };
  }
  if (lower.includes('tiktok.com')) {
    return { icon: '📱', label: 'TikTok video', type: 'tiktok' };
  }
  if (lower.includes('instagram.com')) {
    return { icon: '📸', label: 'Instagram Reel', type: 'instagram' };
  }
  return { icon: '🔗', label: 'Recipe link', type: 'blog' };
}
