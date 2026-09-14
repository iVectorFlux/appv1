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
    id: 'electromagnetism',
    file: 'electromagnetism-v2.html',
    title: 'Electromagnetism',
    subtitle: "Faraday's law · induction and magnetic flux",
    emoji: '🧲',
    subject: 'Science',
    accent: '#7C3AED',
  },
  {
    id: 'force-friction',
    file: 'force-friction-v2.html',
    title: 'Force & friction',
    subtitle: 'f = μN · push, surfaces, and motion',
    emoji: '⚡',
    subject: 'Science',
    accent: '#F97316',
  },
  {
    id: 'fractions',
    file: 'fractions-v2.html',
    title: 'Fractions of a whole',
    subtitle: 'Equal parts you can tap and count',
    emoji: '🍕',
    subject: 'Math',
    accent: '#3B82F6',
  },
  {
    id: 'geoboard',
    file: 'geoboard-shapes.html',
    title: 'Geoboard shapes',
    subtitle: 'Perimeter and area on a pegboard',
    emoji: '🟦',
    subject: 'Math',
    accent: '#0284C7',
  },
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
    id: 'heat-transfer',
    file: 'heat-transfer-v2.html',
    title: 'Heat transfer',
    subtitle: "Fourier's law · conduction through materials",
    emoji: '🔥',
    subject: 'Science',
    accent: '#EF4444',
  },
  {
    id: 'living-systems',
    file: 'living-systems-v2.html',
    title: 'Living systems',
    subtitle: 'Plant growth and photosynthesis',
    emoji: '🌱',
    subject: 'Science',
    accent: '#16A34A',
  },
  {
    id: 'place-value',
    file: 'place-value-decimals.html',
    title: 'Place value & decimals',
    subtitle: 'Tenths and hundredths on a grid',
    emoji: '🔢',
    subject: 'Math',
    accent: '#059669',
  },
  {
    id: 'prism',
    file: 'prism-v2.html',
    title: 'Light & prism',
    subtitle: 'Rainbows from refraction and dispersion',
    emoji: '🌈',
    subject: 'Science',
    accent: '#EC4899',
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
    id: 'relativity',
    file: 'relativity-v2.html',
    title: 'Relativity',
    subtitle: 'Time dilation as speed approaches c',
    emoji: '⏱️',
    subject: 'Science',
    accent: '#6366F1',
  },
  {
    id: 'solar-system',
    file: 'solar-system-v2.html',
    title: 'Solar system',
    subtitle: "Kepler's law · orbits and T² = a³",
    emoji: '🌌',
    subject: 'Science',
    accent: '#8B5CF6',
  },
  {
    id: 'states-of-matter',
    file: 'states-of-matter-v2.html',
    title: 'States of matter',
    subtitle: 'Solid, liquid, gas and kinetic theory',
    emoji: '🧊',
    subject: 'Science',
    accent: '#06B6D4',
  },
  {
    id: 'water-cycle',
    file: 'water-cycle-v2.html',
    title: 'Water cycle',
    subtitle: 'Evaporation, clouds, rain, and runoff',
    emoji: '💧',
    subject: 'Science',
    accent: '#2563EB',
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
