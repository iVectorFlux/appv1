/**
 * Recover tab - opens the Grounding hub directly (same exercises as /grounding).
 */

import { Redirect } from 'expo-router';

export default function RecoverScreen() {
  return <Redirect href="/grounding" />;
}
