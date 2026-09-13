export type InteractiveViewMode = 'pill' | 'drawer' | 'mobile';

export interface InteractiveItem {
  id: string;
  file: string;
  title: string;
  subtitle: string;
  emoji: string;
  subject: string;
  accent: string;
}

export const INTERACTIVES: InteractiveItem[] = [
  {
    id: 'gravity',
    file: 'gravity-v2.html',
    title: 'Gravity & free fall',
    subtitle: 'h = ½gt² · drop, time, and air drag',
    emoji: '🪐',
    subject: 'Science',
    accent: '#7C4DFF',
  },
  {
    id: 'pythagoras',
    file: 'pythagoras-v2.html',
    title: 'Pythagoras',
    subtitle: 'a² + b² = c² · build the right triangle',
    emoji: '📐',
    subject: 'Math',
    accent: '#0EA5E9',
  },
  {
    id: 'wave',
    file: 'wave-v2.html',
    title: 'Waves & Rayleigh',
    subtitle: 'Frequency, wavelength, and why the sky is blue',
    emoji: '🌊',
    subject: 'Science',
    accent: '#06B6D4',
  },
  {
    id: 'addition',
    file: 'addition-subtraction.html',
    title: 'Addition & subtraction',
    subtitle: 'Number line jumps you can play with',
    emoji: '➕',
    subject: 'Math',
    accent: '#F59E0B',
  },
];

export function getInteractiveById(id: string): InteractiveItem | undefined {
  return INTERACTIVES.find((item) => item.id === id);
}

export function interactiveAssetUrl(file: string, mode: InteractiveViewMode, embed = true): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams();
  if (embed) params.set('embed', '1');
  params.set('mode', mode);
  return `${origin}/interectives/${file}?${params.toString()}`;
}
