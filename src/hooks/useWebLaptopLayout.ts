import { Platform, useWindowDimensions } from 'react-native';

/** Viewports this wide use full browser layout (no phone frame). */
export const LAPTOP_WEB_BREAKPOINT = 1024;

/** Narrow phone browsers: full viewport (existing behavior). */
export const MOBILE_WEB_BREAKPOINT = 500;

/** Max content width on laptop web so cards do not stretch edge-to-edge. */
export const WEB_LAPTOP_MAX_CONTENT_WIDTH = 1120;

/**
 * True on web when the window is wide enough for the laptop / desktop layout.
 */
export function useWebLaptopLayout(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= LAPTOP_WEB_BREAKPOINT;
}
